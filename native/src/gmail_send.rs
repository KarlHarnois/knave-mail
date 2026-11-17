use base64::engine::general_purpose::URL_SAFE;
use base64::Engine;
use mail_builder::headers::address::Address;
use mail_builder::MessageBuilder;
use serde_json::json;

pub struct OutgoingMail<'a> {
    pub from: &'a str,
    pub to: &'a [String],
    pub cc: &'a [String],
    pub subject: &'a str,
    pub body: &'a str,
    pub thread_id: Option<&'a str>,
    pub in_reply_to: Option<&'a str>,
    pub references: &'a str,
}

pub fn encoded_send_body(mail: &OutgoingMail, message_id: &str) -> String {
    let mime = mime_message(mail, message_id)
        .write_to_vec()
        .unwrap_or_default();
    let raw = URL_SAFE.encode(mime);
    match mail.thread_id {
        Some(thread) => json!({"raw": raw, "threadId": thread}),
        None => json!({"raw": raw}),
    }
    .to_string()
}

fn mime_message<'a>(mail: &OutgoingMail<'a>, message_id: &str) -> MessageBuilder<'a> {
    let mut builder = MessageBuilder::new()
        .from(mailbox(mail.from))
        .to(mailbox_list(mail.to))
        .subject(mail.subject)
        .text_body(mail.body)
        .message_id(message_id.to_string());
    if !mail.cc.is_empty() {
        builder = builder.cc(mailbox_list(mail.cc));
    }
    if let Some(parent) = mail.in_reply_to {
        builder = builder.in_reply_to(without_brackets(parent));
    }
    if !mail.references.is_empty() {
        builder = builder.references(
            mail.references
                .split_whitespace()
                .map(without_brackets)
                .collect::<Vec<_>>(),
        );
    }
    builder
}

fn mailbox<'x>(written: &str) -> Address<'x> {
    match written.split_once('<') {
        Some((name, rest)) => Address::new_address(
            Some(name.trim().trim_matches('"').to_string()),
            rest.trim_end_matches('>').trim().to_string(),
        ),
        None => Address::new_address(None::<String>, written.trim().to_string()),
    }
}

fn mailbox_list<'x>(written: &[String]) -> Address<'x> {
    Address::new_list(written.iter().map(|one| mailbox(one)).collect())
}

fn without_brackets(id: &str) -> String {
    id.trim_matches(|character| character == '<' || character == '>')
        .to_string()
}
