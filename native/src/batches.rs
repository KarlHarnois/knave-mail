use std::thread;

pub fn in_batches<T: Send>(
    urls: &[String],
    size: usize,
    fetch: impl Fn(&String) -> Result<T, String> + Sync,
) -> Vec<Result<T, String>> {
    let mut replies = Vec::with_capacity(urls.len());
    for batch in urls.chunks(size) {
        thread::scope(|scope| {
            let fetch = &fetch;
            let handles: Vec<_> = batch
                .iter()
                .map(|url| scope.spawn(move || fetch(url)))
                .collect();
            for handle in handles {
                replies.push(
                    handle
                        .join()
                        .unwrap_or_else(|_| Err(String::from("a request thread panicked"))),
                );
            }
        });
    }
    replies
}
