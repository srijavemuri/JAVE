# JAVE

A small community social app built with Express, MongoDB, and plain HTML, CSS, and JavaScript.

## Features

- Create an account and log in
- Share posts, browse the community feed, search posts, and sort by latest or likes
- Like posts and add comments
- Responsive layout for desktop and mobile

## Run locally

1. Install Node.js and make a MongoDB database available.
2. From this directory, install dependencies:

   ```sh
   npm install
   ```

3. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string.
4. Start the app:

   ```sh
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000).

The `.env` file is ignored by Git. Do not commit database credentials.