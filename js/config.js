var db = null;

window.dbReady = (async () => {
    const { key } = await fetch("http://localhost:3000/key", {
        headers: { "origin": window.location.origin }
    }).then(res => res.json());

    const { url } = await fetch("http://localhost:3000/url", {
        headers: { "origin": window.location.origin }
    }).then(res => res.json());

    const { createClient } = supabase;
    db = createClient(url, key);

    console.log("✅ Supabase initialized");
    return db; // Return db when ready
})();



