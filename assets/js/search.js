(function () {
  var results = document.getElementById("search-results");
  if (!results) return;

  var input = document.getElementById("search-input");
  var status = document.getElementById("search-status");
  var query = (new URLSearchParams(window.location.search).get("q") || "").trim();
  input.value = query;
  if (!query) return;

  var base = document.querySelector("form.search-form").getAttribute("action").replace(/search\/$/, "");
  status.textContent = "Searching…";

  fetch(base + "search.json")
    .then(function (r) { return r.json(); })
    .then(function (posts) {
      var terms = query.toLowerCase().split(/\s+/);
      var hits = posts.filter(function (p) {
        var text = (p.title + " " + p.tags.join(" ") + " " + p.content).toLowerCase();
        return terms.every(function (t) { return text.indexOf(t) !== -1; });
      });
      status.textContent = hits.length + (hits.length === 1 ? " post" : " posts") + " matching “" + query + "”";
      hits.forEach(function (p) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = p.url;
        a.textContent = p.title;
        var meta = document.createElement("small");
        meta.textContent = " " + p.date;
        var snippet = document.createElement("p");
        var lower = p.content.toLowerCase();
        var at = Math.max(0, lower.indexOf(terms[0]) - 80);
        snippet.textContent = (at > 0 ? "…" : "") + p.content.substr(at, 220) + "…";
        li.appendChild(a);
        li.appendChild(meta);
        li.appendChild(snippet);
        results.appendChild(li);
      });
    })
    .catch(function () { status.textContent = "Search is unavailable right now."; });
})();
