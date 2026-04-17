use axum::{
    extract::State,
    http::StatusCode,
    response::sse::{Event, Sse},
    routing::{get, post},
    Json, Router,
};
use futures_util::StreamExt;
use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::convert::Infallible;
use std::sync::Arc;
use tokio_stream::wrappers::ReceiverStream;
use tower_http::cors::CorsLayer;
use tracing::{error, info, warn};

const SYSTEM_PROMPT: &str = include_str!("prompt.md");
const MODEL: &str = "claude-sonnet-4-6";
const DELIMITER: &str = "<<<ANALYSIS>>>";

struct AppState {
    http: Client,
    api_key: String,
}

#[derive(Deserialize)]
struct OptimizeRequest {
    brand: String,
    target_audience: String,
    goal_type: String,
    goal: String,
    content: String,
}

#[derive(Deserialize)]
struct FetchContentRequest {
    url: String,
}

#[derive(Serialize)]
struct FetchContentResponse {
    content: String,
    title: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

async fn health() -> Json<Value> {
    info!("GET /api/health");
    Json(json!({ "status": "ok" }))
}

const MOCK_CONTENT: &str = "Start marketing to AI

AI agents advise, recommend, and even make buying decisions for your customers. Unusual is an AI brand alignment platform that helps GTM teams control how large language models (ChatGPT, Claude, Copilot) represent and recommend their products.

Why it matters:
AI models shape buyer perception before your sales team enters the conversation. Without deliberate positioning, your brand gets stale information, weak positioning, or loses to competitors in AI recommendations.

How Unusual works:

Discover
Run brand perception audits on AI models to reveal exactly what they believe about your product, competitors, and weaknesses.

Position
Identify and close gaps in AI knowledge. Unusual recommends content, messaging, and positioning shifts that move AI recommendations in your favor.

Measure
Track changes in AI perception over time across ChatGPT, Claude, Copilot, and other models.

Why Unusual works when SEO does not:

AI models are not search engines. They synthesize patterns from training data and apply reasoning. Generic SEO and content volume do not change how a model thinks about your brand. You need a methodology grounded in AI interpretability.

Unusual's founders built their approach on AI interpretability research: understanding why models make the recommendations they do, then optimizing your positioning to align with how AI actually evaluates companies.

Results:

\"We doubled the number of leads from Copilot within two months of going live with Unusual.\" - Davis Gilbert, Founder and Managing Partner

\"Unusual's content is ChatGPT's go-to reference for us. We now have real control over how LLMs represent us.\" - Raunak Chowdhuri, Founder and CTO

\"The story that AI was telling about us was totally stale. We had no visibility until Unusual.\" - Kaz Tamai, Founder and COO";

const MOCK_ANALYSIS: &str = r#"{
  "changes": [
    {
      "category": "category_definition",
      "description": "Added explicit product category in the opening: 'Unusual is an AI brand alignment platform' with named LLMs (ChatGPT, Claude, Copilot).",
      "reason": "The original content never states what Unusual is or what category it belongs to. Marketers and AI systems searching for solutions use terms like 'AI brand alignment' or 'AI perception management'. Without the category name, the content fails AI retrieval and is ambiguous to first-time readers.",
      "impact": "High — category clarity is the single largest factor in AI discoverability. This makes Unusual findable for searches like 'how to improve brand visibility in ChatGPT' or 'AI brand management tool'."
    },
    {
      "category": "differentiation",
      "description": "Added a 'Why Unusual works when SEO does not' section that grounds differentiation in AI interpretability methodology rather than content volume.",
      "reason": "Competitors likely position around content optimization or search. Unusual's differentiator is AI interpretability expertise. This needs to be stated directly and explained in terms that signal technical depth to GTM teams and CMOs.",
      "impact": "High — this answers the implicit buyer question: 'Why not just add more content or hire an agency?' and establishes intellectual authority that generic tools cannot claim."
    },
    {
      "category": "positioning",
      "description": "Added 'Why it matters' section framing AI model perception as a business risk: lost deals, stale positioning, and competitive loss.",
      "reason": "The original headline 'Start marketing to AI' is catchy but abstract. GTM teams and CMOs need to understand the business consequence before they engage with how the product works.",
      "impact": "High — shifts from 'this is interesting' to 'we could be losing deals right now'. Drives urgency and conversion without overstating the claim."
    },
    {
      "category": "discoverability",
      "description": "Removed duplicate customer quotes and kept one clean instance of each, ordered by business impact.",
      "reason": "Repetition signals low-quality content to AI retrieval systems and wastes reader attention. Unique, high-value social proof is far more retrievable than padded repetition.",
      "impact": "Medium — deduplication improves perceived authority and AI retrieval quality. Ordering by impact (leads first) increases memorability."
    },
    {
      "category": "clarity",
      "description": "Replaced abstract philosophical framing with a direct, buyer-centric explanation of why the methodology works.",
      "reason": "B2B marketers care about tactics and ROI, not AI philosophy. The revised version is shorter and directly explains why Unusual's approach is different from generic alternatives.",
      "impact": "Medium — reduces cognitive load and positions Unusual as pragmatic rather than academic, which matches how GTM buyers evaluate tools."
    }
  ],
  "missed_opportunities": [
    "No specific metrics beyond the Copilot leads quote. Adding a benchmark range would give marketers a realistic expectation of impact.",
    "No call-to-action. The content explains the product but does not guide next steps (demo, audit, free trial).",
    "No pricing or packaging signal. GTM teams want to understand scope before engaging sales.",
    "Limited use-case diversity. All visible customers appear to be B2B SaaS. One example from a different vertical would signal broader applicability.",
    "No mention of how long results take. Two months is referenced in one quote but not positioned as a typical timeline."
  ],
  "summary": {
    "overall_strategy": "Reposition Unusual from abstract 'AI marketing audience' messaging to a concrete platform solving a specific buyer pain: AI model perception management. Anchor differentiation in AI interpretability methodology rather than content volume, and prioritize category clarity, business risk framing, and GTM-team language over philosophical framing.",
    "key_improvements": [
      "Added explicit product category and named LLMs upfront for AI retrieval and first-time reader clarity.",
      "Introduced a differentiation section grounded in AI interpretability expertise.",
      "Reframed the opening around business risk and competitive loss to drive urgency.",
      "Removed duplicate proof and reordered by business impact.",
      "Replaced philosophical tangents with direct, outcome-focused language."
    ]
  }
}"#;

async fn optimize(
    State(state): State<Arc<AppState>>,
    Json(req): Json<OptimizeRequest>,
) -> Sse<ReceiverStream<Result<Event, Infallible>>> {
    info!(
        brand = %req.brand,
        goal_type = %req.goal_type,
        goal = %req.goal,
        content_len = req.content.len(),
        "POST /api/optimize"
    );

    let (tx, rx) = tokio::sync::mpsc::channel(64);

    tokio::spawn(async move {
        // ── Mock mode ─────────────────────────────────────────────────────────
        if std::env::var("MOCK_OPTIMIZE").as_deref() == Ok("true") {
            info!("mock mode: streaming mock response");

            let words: Vec<&str> = MOCK_CONTENT.split(' ').collect();
            for (i, word) in words.iter().enumerate() {
                let chunk = if i == 0 { word.to_string() } else { format!(" {}", word) };
                if tx.send(Ok(Event::default().event("token").data(chunk))).await.is_err() {
                    return;
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(12)).await;
            }

            let analysis: Value = serde_json::from_str(MOCK_ANALYSIS).expect("mock analysis is valid JSON");
            let _ = tx.send(Ok(Event::default().event("analysis").data(analysis.to_string()))).await;
            return;
        }

        // ── Real Anthropic streaming call ──────────────────────────────────────
        let user_message = format!(
            "brand: {}\ntarget_audience: {}\ngoal_type: {}\ngoal: {}\n\ncontent:\n{}",
            req.brand, req.target_audience, req.goal_type, req.goal, req.content
        );

        let body = json!({
            "model": MODEL,
            "max_tokens": 4096,
            "stream": true,
            "system": SYSTEM_PROMPT,
            "messages": [{ "role": "user", "content": user_message }]
        });

        info!(model = MODEL, user_message = %user_message, "sending streaming request to Anthropic");

        let res = match state.http
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &state.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                error!(err = %e, "network error calling Anthropic");
                let _ = tx.send(Ok(Event::default().event("error").data(e.to_string()))).await;
                return;
            }
        };

        let http_status = res.status();
        info!(http_status = %http_status, "received Anthropic streaming response");

        if !http_status.is_success() {
            let text = res.text().await.unwrap_or_default();
            error!(http_status = %http_status, body = %text, "Anthropic returned error");
            let _ = tx.send(Ok(Event::default()
                .event("error")
                .data(format!("Anthropic error {http_status}: {text}")))).await;
            return;
        }

        let mut byte_stream = res.bytes_stream();
        let mut sse_buf = String::new();
        let mut full_text = String::new();
        let mut sent_len: usize = 0;
        let mut past_delimiter = false;

        'outer: while let Some(chunk) = byte_stream.next().await {
            let bytes = match chunk {
                Ok(b) => b,
                Err(e) => {
                    error!(err = %e, "stream read error");
                    let _ = tx.send(Ok(Event::default().event("error").data(e.to_string()))).await;
                    return;
                }
            };

            sse_buf.push_str(&String::from_utf8_lossy(&bytes));

            while let Some(frame_end) = sse_buf.find("\n\n") {
                let frame = sse_buf[..frame_end].to_string();
                sse_buf = sse_buf[frame_end + 2..].to_string();

                let mut data_line: &str = "";
                for line in frame.lines() {
                    if let Some(d) = line.strip_prefix("data: ") {
                        data_line = d;
                    }
                }

                if data_line == "[DONE]" {
                    break 'outer;
                }
                if data_line.is_empty() {
                    continue;
                }

                let event_val: Value = match serde_json::from_str(data_line) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                match event_val["type"].as_str() {
                    Some("content_block_delta") => {
                        if event_val["delta"]["type"] != "text_delta" {
                            continue;
                        }
                        let text = match event_val["delta"]["text"].as_str() {
                            Some(t) if !t.is_empty() => t,
                            _ => continue,
                        };

                        full_text.push_str(text);

                        if !past_delimiter {
                            if let Some(delim_pos) = full_text.find(DELIMITER) {
                                past_delimiter = true;
                                if delim_pos > sent_len {
                                    let to_send = full_text[sent_len..delim_pos].to_string();
                                    if tx.send(Ok(Event::default().event("token").data(to_send))).await.is_err() {
                                        return;
                                    }
                                    sent_len = delim_pos;
                                }
                            } else {
                                let to_send = full_text[sent_len..].to_string();
                                if !to_send.is_empty() {
                                    if tx.send(Ok(Event::default().event("token").data(to_send))).await.is_err() {
                                        return;
                                    }
                                    sent_len = full_text.len();
                                }
                            }
                        }
                    }
                    Some("message_start") => {
                        info!(
                            input_tokens = event_val["message"]["usage"]["input_tokens"].as_u64().unwrap_or(0),
                            "message_start"
                        );
                    }
                    Some("message_delta") => {
                        info!(
                            stop_reason = %event_val["delta"]["stop_reason"].as_str().unwrap_or("unknown"),
                            output_tokens = event_val["usage"]["output_tokens"].as_u64().unwrap_or(0),
                            "message_delta usage"
                        );
                    }
                    _ => {}
                }
            }
        }

        info!(total_len = full_text.len(), past_delimiter, "stream complete");

        // ── Parse analysis section ─────────────────────────────────────────────
        let analysis_json = if let Some(delim_pos) = full_text.find(DELIMITER) {
            let after = full_text[delim_pos + DELIMITER.len()..].trim();
            match (after.find('{'), after.rfind('}')) {
                (Some(start), Some(end)) if end > start => {
                    match serde_json::from_str::<Value>(&after[start..=end]) {
                        Ok(v) => v,
                        Err(e) => {
                            error!(err = %e, raw = %after, "failed to parse analysis JSON");
                            let _ = tx.send(Ok(Event::default().event("error")
                                .data(format!("JSON parse error: {e}")))).await;
                            return;
                        }
                    }
                }
                _ => {
                    error!(raw = %full_text, "no JSON object found after delimiter");
                    let _ = tx.send(Ok(Event::default().event("error")
                        .data("no analysis JSON found".to_string()))).await;
                    return;
                }
            }
        } else {
            // Fallback: model ignored new format, try legacy full-JSON parse
            warn!("no ANALYSIS delimiter found — attempting legacy JSON fallback");
            match (full_text.find('{'), full_text.rfind('}')) {
                (Some(start), Some(end)) if end > start => {
                    match serde_json::from_str::<Value>(&full_text[start..=end]) {
                        Ok(v) => {
                            if let Some(c) = v["optimized_content"].as_str() {
                                let _ = tx.send(Ok(Event::default().event("token").data(c.to_string()))).await;
                            }
                            v
                        }
                        Err(e) => {
                            error!(err = %e, "legacy JSON parse also failed");
                            let _ = tx.send(Ok(Event::default().event("error")
                                .data(format!("parse error: {e}")))).await;
                            return;
                        }
                    }
                }
                _ => {
                    error!("no parseable content in response");
                    let _ = tx.send(Ok(Event::default().event("error")
                        .data("no parseable content in response".to_string()))).await;
                    return;
                }
            }
        };

        let changes = analysis_json["changes"].as_array().cloned().unwrap_or_default();
        let missed = analysis_json["missed_opportunities"].as_array().cloned().unwrap_or_default();

        if changes.is_empty() {
            warn!("model returned zero changes");
        }

        info!(changes = changes.len(), missed_opportunities = missed.len(), "optimize complete");

        let payload = json!({
            "changes": changes,
            "missed_opportunities": missed,
            "summary": analysis_json["summary"],
        });

        let _ = tx.send(Ok(Event::default().event("analysis").data(payload.to_string()))).await;
    });

    Sse::new(ReceiverStream::new(rx))
}

async fn fetch_content(
    State(state): State<Arc<AppState>>,
    Json(req): Json<FetchContentRequest>,
) -> Result<Json<FetchContentResponse>, (StatusCode, Json<ErrorResponse>)> {
    info!(url = %req.url, "POST /api/fetch-content");

    let res = state
        .http
        .get(&req.url)
        .header("User-Agent", "Mozilla/5.0 (compatible; content-fetcher/1.0)")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| {
            error!(err = %e, url = %req.url, "network error fetching URL");
            make_err(StatusCode::BAD_GATEWAY, e.to_string())
        })?;

    let status = res.status();
    info!(url = %req.url, http_status = %status, "received response from URL");

    if !status.is_success() {
        return Err(make_err(
            StatusCode::BAD_GATEWAY,
            format!("Page returned HTTP {status}"),
        ));
    }

    let html = res.text().await.map_err(|e| {
        error!(err = %e, "failed to read response body");
        make_err(StatusCode::BAD_GATEWAY, e.to_string())
    })?;

    let document = Html::parse_document(&html);

    let title_sel = Selector::parse("title").unwrap();
    let title = document
        .select(&title_sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let remove_sel = Selector::parse(
        "script, style, nav, header, footer, noscript, iframe, [aria-hidden='true']",
    )
    .unwrap();

    let body_sel = Selector::parse("body").unwrap();
    let mut lines: Vec<String> = Vec::new();

    let root_el = document.select(&body_sel).next()
        .map(|b| scraper::ElementRef::wrap(*b).unwrap_or(document.root_element()))
        .unwrap_or(document.root_element());

    for node in root_el.descendants() {
        if node.ancestors().any(|a| {
            scraper::ElementRef::wrap(a)
                .map(|el| remove_sel.matches(&el))
                .unwrap_or(false)
        }) {
            continue;
        }
        if let Some(text) = node.value().as_text() {
            let t = text.trim();
            if !t.is_empty() {
                lines.push(t.to_string());
            }
        }
    }

    let raw = lines.join("\n");
    let content = collapse_blank_lines(raw.trim());

    if content.is_empty() {
        return Err(make_err(StatusCode::BAD_REQUEST, "No readable content found".into()));
    }

    let content = truncate(content);
    info!(url = %req.url, content_len = content.len(), "fetch-content complete");

    Ok(Json(FetchContentResponse { content, title }))
}

fn collapse_blank_lines(s: &str) -> String {
    let mut result = String::new();
    let mut blank_run = 0usize;
    for line in s.lines() {
        if line.trim().is_empty() {
            blank_run += 1;
            if blank_run <= 1 {
                result.push('\n');
            }
        } else {
            blank_run = 0;
            result.push_str(line);
            result.push('\n');
        }
    }
    result.trim().to_string()
}

fn truncate(mut s: String) -> String {
    const LIMIT: usize = 8000;
    if s.len() > LIMIT {
        s.truncate(LIMIT);
        s.push_str("... [truncated]");
    }
    s
}

fn make_err(status: StatusCode, message: String) -> (StatusCode, Json<ErrorResponse>) {
    (status, Json(ErrorResponse { error: message }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=debug,tower_http=info".parse().unwrap()),
        )
        .init();

    dotenvy::dotenv().ok();

    let api_key = std::env::var("ANTHROPIC_API_KEY").expect("ANTHROPIC_API_KEY must be set");

    info!("starting backend");

    let state = Arc::new(AppState {
        http: Client::new(),
        api_key,
    });

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/optimize", post(optimize))
        .route("/api/fetch-content", post(fetch_content))
        .with_state(state)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    info!("listening on http://localhost:8080");
    axum::serve(listener, app).await.unwrap();
}
