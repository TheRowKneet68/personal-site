# TheRowKneet — personal site

Ronit Baniya Gupta's personal site. Built by hand, no framework, no template.

## run it

```
node server.js
```

Open http://localhost:3000

## admin panel

http://localhost:3000/admin.html

- default password: `build-it-2026`
- change it: run `node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"` and put the hash in `server.js` at `ADMIN_PASSWORD_HASH` (or set the `ADMIN_PASSWORD_HASH` env var).
- from there you can add / edit / delete projects and wins, and upload images. Everything saves to `data.json`.

## structure

```
server.js        zero-dependency node server (static + json api + auth)
data.json        all content — profile, projects, wins
public/
  index.html     the site
  admin.html     control room
  css/style.css
  js/main.js     site renderer
  js/admin.js    admin renderer
  images/        logo, favicon, photos
  uploads/       images uploaded from admin
```

## deploy

Static-ish but needs node for the admin API. Easiest: a $5 VPS / Railway / Render free tier running `npm start`. Everything is in `data.json` so it's trivial to back up.
