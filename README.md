# Modern Blog Post Cards with Language Toggle

This mini-project demonstrates how to fetch blog posts from a WordPress REST API, render them as sleek responsive cards, and provide an **English / हिन्दी** toggle with on-the-fly machine translation.

## Folder structure

```
2026_LAB/
└─ STATIC/
   ├─ index.html    # Mark-up & language switcher
   ├─ style.css     # Tailored styling (cards, loader, language pills)
   └─ script.js     # Fetch, render, translate
```

## Features

- **Card grid** – responsive CSS grid with light & dark-mode themes.
- **Animated loader** – gradient ring + text shown during network actions.
- **Language switcher** – pill buttons switch between English and Hindi.
- **Client-side translation** – missing Hindi text is retrieved once per post via the free MyMemory API and cached for the browsing session.

## How it works

1. `script.js` fetches the latest posts from:
   `https://shivjhawebtech.online/wp-json/wp/v2/posts?_embed&per_page=12`
2. The response is cached in `cachedPosts`.
3. Clicking **हिन्दी** triggers `translateMissingToHindi()`:
   - Builds an array of `title + \n + excerpt` strings that still need Hindi.
   - Requests translations via `https://api.mymemory.translated.net/get` (no CORS pre-flight).
   - Saves results in a `translations` map keyed by `post.id`.
4. `renderPosts()` looks up Hindi text when `currentLang === "hi"`, otherwise shows English.
5. Loader spinner + “Please wait…” (or “कृपया प्रतीक्षा करें…”) give user feedback.

## Running locally

1. Serve the `STATIC` folder with any static server, e.g. VS Code Live Server or:
   ```bash
   npx serve STATIC
   ```
2. Open the served `index.html` in your browser.

## Extending / production considerations

### Behind the Hindi toggle

1. **Single source of truth** – English posts are fetched once and stored in `cachedPosts`.
2. **Switching to _हिन्दी_** – `translateMissingToHindi()`
   - Builds an array containing the `title` + line-break + `excerpt` for posts that are not yet translated.
   - Sends each string to the free **MyMemory** endpoint:
     `https://api.mymemory.translated.net/get?q=<TEXT>&langpair=en|hi`.
   - Saves the results in the `translations` map so every post is translated at most once per session.
3. **Rendering** – `renderPosts()` checks `translations[post.id]`.
   - If Hindi text exists and `currentLang === "hi"`, it is used; otherwise English text is shown.
4. **User feedback** – A spinner plus “कृपया प्रतीक्षा करें…” is displayed while translation calls complete.

### Client-side auto-translate: Pros & Cons

| Aspect            | Value |
|-------------------|-------|
| Setup             | No changes to WordPress content |
| Cost              | Free API within rate limits |
| SEO               | Hindi not indexable (rendered after JS) |
| Quality control   | Dependent on MT; cannot manually edit |

## WordPress-side solutions for permanent Hindi content

### 1. Multilingual plugin (WPML / Polylang / TranslatePress)
- Creates a dedicated Hindi version for each post (better SEO).
- Gutenberg editor lets you refine machine-translated text.
- Front-end gets language-aware permalinks (`/hi/my-post`) plus `hreflang` tags.

### 2. Lightweight custom-field method
1. Register two meta fields (`title_hi`, `excerpt_hi`) via code or ACF.
2. Add an admin-side button that calls an MT API once and stores the Hindi copy.
3. Expose the fields in the REST API so front-end can read them:
   ```php
   // theme/functions.php
   add_action( 'rest_api_init', function () {
       register_rest_field( 'post', 'title_hi', [
           'get_callback' => fn ($post) => get_post_meta( $post['id'], 'title_hi', true ),
           'schema'       => null,
       ] );
   } );
   ```
4. Front-end decides which language to display based on the user’s choice.

### Migration path
- Add the Hindi fields or activate a multilingual plugin.
- Use **WP-CLI** to loop through all posts, translate once, store Hindi strings.
- Update the JS to consume pre-translated content and drop runtime translation.

> **Production tip:** choose a server-side solution if you need crawlable Hindi pages and full editorial control. Keep the client-side toggle only for demos or low-traffic sites.

---
MIT License · 2026

If you want native Hindi copies stored in WordPress (better SEO & controllable wording) here are two common approaches:

Use a multilingual plugin
WPML, Polylang, or TranslatePress create a separate Hindi post (or translation row) for every original post.
Gutenberg shows a language switch in the editor; you can manually tweak the Hindi version after machine-pre-translation (WPML and TranslatePress have built-in Deepl/Google connectors).
On the frontend you get language-aware permalinks (/hi/my-post), automatic hreflang tags, and a language switcher widget.
Custom-field method (lightweight)
Install ACF (Advanced Custom Fields) or register two meta fields:
title_hi
excerpt_hi (or content_hi)
Build a small admin-side button (React component in a block, or Classic metabox) that calls a translation API to prefill those fields.
REST API filter: add the Hindi fields to wp_json_prepare_post.
Frontend JS/PHP can then read both English & Hindi in one request and render according to user selection.
php
// theme/functions.php
add_action( 'rest_api_init', function () {
    register_rest_field( 'post', 'title_hi', [
        'get_callback' => fn( $post ) => get_post_meta( $post['id'], 'title_hi', true ),
        'update_callback' => null,
        'schema' => null,
    ] );
} );
Benefits: keeps everything in one post; no heavy multilingual plugin.
Migration path
Add Hindi meta fields (or enable a multilingual plugin).
Write a WP-CLI script to loop through all posts, call your preferred MT API once, store the Hindi strings.
Replace the client-side fetch in script.js with the REST endpoint that already contains both languages; drop run-time translation.
Recommendation
For a production site where Hindi should be crawlable by search engines, adopt WPML / Polylang or the custom-field pattern.
Keep the current client-side approach only as a quick demo or for prototyping.