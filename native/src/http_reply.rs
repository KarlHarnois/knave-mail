use ureq::http::Response;
use ureq::Body;

const LARGEST_BODY_BYTES: u64 = 64 * 1024 * 1024;
const MILLISECONDS_PER_SECOND: i64 = 1000;

pub struct ReadReply {
    pub status: u16,
    pub body: String,
    pub retry_after: Option<i64>,
}

pub fn reply_from(mut response: Response<Body>) -> Result<ReadReply, String> {
    let status = response.status().as_u16();
    let retry_after = retry_after_milliseconds(&response);
    response
        .body_mut()
        .with_config()
        .limit(LARGEST_BODY_BYTES)
        .read_to_string()
        .map(|body| ReadReply {
            status,
            body,
            retry_after,
        })
        .map_err(|error| format!("the answer was cut short: {}", error))
}

fn retry_after_milliseconds(response: &Response<Body>) -> Option<i64> {
    let seconds = response.headers().get("retry-after")?.to_str().ok()?;
    seconds
        .trim()
        .parse::<i64>()
        .ok()
        .map(|seconds| seconds * MILLISECONDS_PER_SECOND)
}
