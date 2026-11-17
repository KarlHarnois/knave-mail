use base64::alphabet::URL_SAFE;
use base64::engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig};
use base64::Engine;
use mail_parser::{Addr, Address, Message, MessageParser};
use serde_json::Value;

#[derive(Default)]
pub struct ParsedMessage {
    pub from: String,
    pub to: Vec<String>,
    pub cc: Vec<String>,
    pub subject: String,
    pub date: i64,
    pub text: String,
    pub html: Option<String>,
    pub header_id: String,
    pub references: String,
}

pub fn parsed_message(gmail_message: &Value) -> ParsedMessage {
    let date = internal_date(gmail_message);
    match MessageParser::default().parse(&raw_bytes(gmail_message)) {
        Some(parsed) => ParsedMessage::read(&parsed, date),
        None => ParsedMessage {
            date,
            ..ParsedMessage::default()
        },
    }
}

fn internal_date(gmail_message: &Value) -> i64 {
    gmail_message["internalDate"]
        .as_str()
        .and_then(|date| date.parse().ok())
        .unwrap_or(0)
}

fn raw_bytes(gmail_message: &Value) -> Vec<u8> {
    let raw = gmail_message["raw"].as_str().unwrap_or_default();
    let padding_optional =
        GeneralPurposeConfig::new().with_decode_padding_mode(DecodePaddingMode::Indifferent);
    GeneralPurpose::new(&URL_SAFE, padding_optional)
        .decode(raw.trim())
        .unwrap_or_default()
}

impl ParsedMessage {
    fn read(parsed: &Message, date: i64) -> ParsedMessage {
        ParsedMessage {
            from: addresses(parsed.from())
                .into_iter()
                .next()
                .unwrap_or_default(),
            to: addresses(parsed.to()),
            cc: addresses(parsed.cc()),
            subject: parsed.subject().unwrap_or_default().to_string(),
            date,
            text: parsed
                .body_text(0)
                .map(|text| text.replace("\r\n", "\n"))
                .unwrap_or_default(),
            html: html_body(parsed),
            header_id: parsed.message_id().map(bracketed).unwrap_or_default(),
            references: references(parsed),
        }
    }
}

fn addresses(list: Option<&Address>) -> Vec<String> {
    list.map(|list| list.iter().map(mailbox_text).collect())
        .unwrap_or_default()
}

fn mailbox_text(mailbox: &Addr) -> String {
    match (mailbox.name.as_deref(), mailbox.address.as_deref()) {
        (Some(name), Some(address)) => format!("{} <{}>", name, address),
        (None, Some(address)) => address.to_string(),
        (Some(name), None) => name.to_string(),
        (None, None) => String::new(),
    }
}

fn html_body(parsed: &Message) -> Option<String> {
    parsed.html_part(0).filter(|part| part.is_text_html())?;
    parsed.body_html(0).map(|html| html.into_owned())
}

fn references(parsed: &Message) -> String {
    let header = parsed.references();
    header
        .as_text_list()
        .map(|ids| {
            ids.iter()
                .map(|id| bracketed(id))
                .collect::<Vec<_>>()
                .join(" ")
        })
        .or_else(|| header.as_text().map(bracketed))
        .unwrap_or_default()
}

fn bracketed(id: &str) -> String {
    format!("<{}>", id)
}
