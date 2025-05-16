# DriveDoc - Highway Services Solution

A real-time highway services management system with chat support and document management.

## Features

- Real-time chat system
- Document management
- Traffic monitoring
- Admin dashboard
- Emergency services
- Payment integration

## Tech Stack

- Node.js
- Express
- MongoDB
- Socket.IO
- HTML/CSS/JavaScript

## Deployment

This application is deployed on Railway.app. To deploy your own instance:

1. Fork this repository
2. Sign up on [Railway.app](https://railway.app)
3. Create a new project and select "Deploy from GitHub repo"
4. Select this repository
5. Add the following environment variables:
   - `PORT`: 3000
   - `MONGODB_URI`: Your MongoDB connection string

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/dharmikmani123/DriveDoc.git
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file with:
```
PORT=3000
MONGODB_URI=your_mongodb_uri
```

4. Run the development server:
```bash
npm run dev
```

## License

ISC 