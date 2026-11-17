use std::collections::HashSet;

use serde_json::Value;

const TYPED_RECORDS: [&str; 4] = [
    "messagesAdded",
    "messagesDeleted",
    "labelsAdded",
    "labelsRemoved",
];

pub fn history_shape(page: &Value) -> String {
    let records = page["history"].as_array().cloned().unwrap_or_default();
    let count = |kind: &str| {
        records
            .iter()
            .map(|record| record[kind].as_array().map_or(0, Vec::len))
            .sum::<usize>()
    };
    let untyped: usize = records.iter().map(untyped_message_changes).sum();
    format!(
        "{} records, {} messages added, {} deleted, {} labels added, {} labels removed, {} message changes without a type",
        records.len(),
        count("messagesAdded"),
        count("messagesDeleted"),
        count("labelsAdded"),
        count("labelsRemoved"),
        untyped
    )
}

fn untyped_message_changes(record: &Value) -> usize {
    let typed = typed_message_ids(record);
    record["messages"].as_array().map_or(0, |messages| {
        messages
            .iter()
            .filter(|message| !typed.contains(message["id"].as_str().unwrap_or("")))
            .count()
    })
}

fn typed_message_ids(record: &Value) -> HashSet<String> {
    TYPED_RECORDS
        .iter()
        .flat_map(|kind| record[*kind].as_array().cloned().unwrap_or_default())
        .filter_map(|item| item["message"]["id"].as_str().map(str::to_string))
        .collect()
}
