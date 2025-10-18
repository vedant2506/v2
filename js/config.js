var db = null;

window.dbReady = (async () => {
    const { key } = await fetch("https://attendance-server-t4he.onrender.com/key", {
        headers: { "origin": window.location.origin }
    }).then(res => res.json());

    const { url } = await fetch("https://attendance-server-t4he.onrender.com/url", {
        headers: { "origin": window.location.origin }
    }).then(res => res.json());

    const { createClient } = supabase;
    db = createClient(url, key);

    return db; // Return db when ready
})();



