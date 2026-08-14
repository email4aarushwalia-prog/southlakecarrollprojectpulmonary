// ===========================================================
// BLOG LOADER
// Fetches markdown posts (added via /admin, the content editor)
// straight from GitHub and renders them here — no rebuild needed.
//
// SETUP: once this site is connected to a GitHub repo in Netlify,
// fill in your repo details below. Until then this file safely
// does nothing and the "coming soon" message shows instead.
// ===========================================================

var BLOG_REPO = {
  owner: "REPLACE_WITH_GITHUB_USERNAME",
  repo: "REPLACE_WITH_REPO_NAME",
  branch: "main"
};

(function () {
  var isConfigured =
    BLOG_REPO.owner.indexOf("REPLACE") === -1 &&
    BLOG_REPO.repo.indexOf("REPLACE") === -1;

  var container = document.getElementById("blog-posts");
  var emptyState = document.getElementById("blog-empty");
  if (!container) return;

  if (!isConfigured) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  var apiUrl =
    "https://api.github.com/repos/" +
    BLOG_REPO.owner +
    "/" +
    BLOG_REPO.repo +
    "/contents/content/blog?ref=" +
    BLOG_REPO.branch;

  fetch(apiUrl)
    .then(function (res) {
      if (!res.ok) throw new Error("Could not list posts");
      return res.json();
    })
    .then(function (files) {
      var mdFiles = files.filter(function (f) {
        return f.name.endsWith(".md");
      });
      if (!mdFiles.length) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }
      return Promise.all(
        mdFiles.map(function (f) {
          return fetch(f.download_url).then(function (r) {
            return r.text();
          });
        })
      );
    })
    .then(function (rawPosts) {
      if (!rawPosts) return;
      var posts = rawPosts.map(parsePost).filter(Boolean);
      posts.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
      renderPosts(posts);
    })
    .catch(function () {
      if (emptyState) emptyState.style.display = "block";
    });

  function parsePost(raw) {
    var match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return null;
    var frontmatter = match[1];
    var body = match[2];
    var post = { body: body };

    frontmatter.split(/\r?\n/).forEach(function (line) {
      var idx = line.indexOf(":");
      if (idx === -1) return;
      var key = line.slice(0, idx).trim();
      var value = line.slice(idx + 1).trim();
      value = value.replace(/^["']|["']$/g, "");
      post[key] = value;
    });

    return post;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function renderPosts(posts) {
    if (!posts.length) {
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    container.innerHTML = posts
      .map(function (post, i) {
        var bodyHtml =
          window.marked && window.marked.parse
            ? window.marked.parse(post.body || "")
            : (post.body || "").replace(/\n/g, "<br>");

        var image = post.image
          ? '<img src="' +
            post.image +
            '" alt="" style="width:100%;border-radius:6px;margin-bottom:18px;">'
          : "";

        return (
          '<article class="blog-card" style="margin-bottom:24px;">' +
          image +
          '<div class="date">' +
          formatDate(post.date) +
          (post.author ? " &middot; " + post.author : "") +
          "</div>" +
          "<h3>" +
          (post.title || "Untitled Post") +
          "</h3>" +
          (post.summary ? "<p><em>" + post.summary + "</em></p>" : "") +
          '<div class="blog-body">' +
          bodyHtml +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }
})();
