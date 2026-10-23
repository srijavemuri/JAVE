const $ = (id) => document.getElementById(id);
const userStorageKey = "commonRoomUser";
const likesStorageKey = "commonRoomLikes";
const avatarColors = ["#dce7ff", "#f5e7bf", "#e8e2ff", "#f3ddd4", "#d9e3fb"];

let user = readStorage(userStorageKey, null);
let posts = [];
let sortMode = "latest";
let searchTerm = "";
const likedPosts = new Set(readStorage(likesStorageKey, []));

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the feed usable when storage is unavailable.
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Keep the feed usable when storage is unavailable.
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Something went wrong.");
  return data;
}

function setUser(nextUser) {
  user = nextUser;
  if (user) saveStorage(userStorageKey, user);
  else removeStorage(userStorageKey);

  $("auth").classList.toggle("hidden", Boolean(user));
  $("account").classList.toggle("hidden", !user);
  $("headerLogin").textContent = user ? "Your account" : "Log in";

  if (user) {
    $("userName").textContent = user.username;
    $("accountAvatar").textContent = user.username.slice(0, 1);
    $("composerAvatar").textContent = user.username.slice(0, 1);
    $("postName").value = user.username;
    $("postName").readOnly = true;
  } else {
    $("composerAvatar").textContent = "Y";
    $("postName").readOnly = false;
    $("postName").value = "";
  }
}

function showLogin() {
  $("registerPanel").classList.add("hidden");
  $("loginPanel").classList.remove("hidden");
  $("authStatus").textContent = "";
  $("auth").scrollIntoView({ behavior: "smooth", block: "center" });
  $("loginEmail").focus({ preventScroll: true });
}

function showRegister() {
  $("loginPanel").classList.add("hidden");
  $("registerPanel").classList.remove("hidden");
  $("authStatus").textContent = "";
}

function initials(name) {
  return (name || "Guest")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function relativeDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function addComment(comments, comment) {
  const line = document.createElement("p");
  const name = document.createElement("strong");
  name.textContent = `${comment.username || "Guest"}: `;
  line.append(name, document.createTextNode(comment.text || ""));
  comments.append(line);
}

function postCard(post, index) {
  const card = document.createElement("article");
  card.className = "post-card";

  const header = document.createElement("div");
  header.className = "posthead";
  const avatar = document.createElement("span");
  avatar.className = "post-avatar";
  avatar.style.setProperty("--avatar-color", avatarColors[index % avatarColors.length]);
  avatar.textContent = initials(post.username);

  const meta = document.createElement("div");
  meta.className = "post-meta";
  const name = document.createElement("strong");
  name.textContent = post.username || "Guest";
  const date = document.createElement("span");
  date.className = "date";
  date.textContent = relativeDate(post.createdAt);
  meta.append(name, date);
  header.append(avatar, meta);

  const content = document.createElement("p");
  content.className = "post-content";
  content.textContent = post.content || "";

  const actions = document.createElement("div");
  actions.className = "post-actions";
  const like = document.createElement("button");
  const isLiked = likedPosts.has(String(post._id));
  like.type = "button";
  like.className = `like-button${isLiked ? " is-liked" : ""}`;
  like.setAttribute("aria-pressed", String(isLiked));
  like.disabled = isLiked;
  like.innerHTML = `<span aria-hidden="true">${isLiked ? "♥" : "♡"}</span><span>${post.likes || 0} likes</span>`;
  like.addEventListener("click", async () => {
    like.disabled = true;
    try {
      const updated = await request(`/api/posts/${post._id}/like`, { method: "PATCH" });
      post.likes = updated.likes;
      likedPosts.add(String(post._id));
      saveStorage(likesStorageKey, [...likedPosts]);
      renderPosts();
    } catch (error) {
      like.disabled = false;
      $("loadStatus").textContent = error.message;
    }
  });

  const commentCount = document.createElement("span");
  commentCount.className = "comment-count";
  commentCount.innerHTML = `<span aria-hidden="true">◌</span> ${(post.comments || []).length} comments`;
  actions.append(like, commentCount);

  const comments = document.createElement("div");
  comments.className = "comments";
  (post.comments || []).forEach((comment) => addComment(comments, comment));

  const form = document.createElement("form");
  form.className = "comment-form";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Add to the conversation…";
  input.maxLength = 500;
  input.setAttribute("aria-label", "Write a comment");
  input.required = true;
  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Reply";
  form.append(input, send);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    send.disabled = true;
    try {
      const updated = await request(`/api/posts/${post._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user ? user.username : "Guest", text: input.value.trim() })
      });
      posts = posts.map((item) => String(item._id) === String(updated._id) ? updated : item);
      renderPosts();
    } catch (error) {
      $("loadStatus").textContent = error.message;
      send.disabled = false;
    }
  });

  card.append(header, content, actions, comments, form);
  return card;
}

function renderPosts() {
  const visiblePosts = posts.filter((post) => {
    const searchable = `${post.username || ""} ${post.content || ""}`.toLowerCase();
    return searchable.includes(searchTerm);
  });
  if (sortMode === "popular") visiblePosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else visiblePosts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  $("posts").replaceChildren();
  visiblePosts.forEach((post, index) => $("posts").append(postCard(post, index)));
  $("loadStatus").textContent = "";

  if (!visiblePosts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    title.textContent = searchTerm ? "Nothing in the room yet." : "The room is yours.";
    const message = document.createElement("span");
    message.textContent = searchTerm ? "Try another search or start a new conversation." : "Leave the first little note and see who joins in.";
    empty.append(title, message);
    $("posts").append(empty);
  }
}

async function loadPosts() {
  $("loadStatus").textContent = "Finding your people…";
  try {
    posts = await request("/api/posts");
    renderPosts();
  } catch (error) {
    $("loadStatus").textContent = error.message;
  }
}

$("toLogin").addEventListener("click", showLogin);
$("headerLogin").addEventListener("click", () => {
  if (user) $("postForm").scrollIntoView({ behavior: "smooth", block: "center" });
  else showLogin();
});
$("toRegister").addEventListener("click", showRegister);

$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const email = $("regEmail").value.trim();
    const data = await request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $("regName").value.trim(),
        email: $("regEmail").value.trim(),
        password: $("regPass").value
      })
    });
    $("registerForm").reset();
    showLogin();
    $("authStatus").textContent = `${data.message} Please log in.`;
    $("loginEmail").value = email;
  } catch (error) {
    $("authStatus").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const data = await request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPass").value })
    });
    setUser(data.user);
    $("loginForm").reset();
  } catch (error) {
    $("authStatus").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$("logout").addEventListener("click", () => {
  setUser(null);
  showRegister();
});

$("postForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = user ? user.username : $("postName").value.trim();
  const content = $("postText").value.trim();
  if (!username || !content) return;

  $("share").disabled = true;
  $("postStatus").textContent = "Sharing your post…";
  try {
    const post = await request("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, content })
    });
    posts.unshift(post);
    $("postText").value = "";
    $("postStatus").textContent = "Your post is in the room.";
    searchTerm = "";
    $("searchInput").value = "";
    renderPosts();
  } catch (error) {
    $("postStatus").textContent = error.message;
  } finally {
    $("share").disabled = false;
  }
});

$("searchInput").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderPosts();
});

$("discoverButton").addEventListener("click", () => {
  $("searchInput").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    sortMode = button.dataset.sort;
    document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
    renderPosts();
  });
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    $("postText").value = button.dataset.prompt;
    $("postText").focus();
    $("postForm").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    searchTerm = button.dataset.search.toLowerCase();
    $("searchInput").value = button.dataset.search;
    renderPosts();
    $("feed").scrollIntoView({ behavior: "smooth" });
  });
});

setUser(user);
$("currentDate").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date()).toUpperCase();
loadPosts();