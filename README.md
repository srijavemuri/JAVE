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

## Deploy on Render

1. In Render, create a new Blueprint and connect this GitHub repository.
2. Render reads `render.yaml` and asks for `MONGODB_URI`. Enter the MongoDB Atlas connection string as a secret environment variable.
3. Add Render's outbound access as allowed in the Atlas network access settings if your Atlas configuration requires it.
4. Wait for the service to become live, then open its `onrender.com` URL on desktop or mobile.

The free web service may sleep after inactivity and take a short time to wake up.