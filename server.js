const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/drivedoc';
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));


const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created uploads directory:', uploadDir);
    } catch (err) {
        console.error('Error creating uploads directory:', err);
    }
}


const documentSchema = new mongoose.Schema({
    name: String,
    type: String,
    expiry: Date,
    fileUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
        cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 
    },
  fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
        }
    }
});


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));


app.post('/api/documents', upload.single('document'), async (req, res) => {
  try {
        console.log('Received document upload request');
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

    if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!req.body.docType) {
            console.error('Document type is required');
            return res.status(400).json({ error: 'Document type is required' });
        }

        const document = new Document({
            name: req.body.docName || req.file.originalname,
            type: req.body.docType,
            expiry: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
            fileUrl: `/uploads/${req.file.filename}`
        });

        console.log('Saving document to database:', document);
        await document.save();
        console.log('Document saved successfully');

        res.json({ 
      success: true,
      document: {
                id: document._id,
                name: document.name,
                type: document.type,
                expiry: document.expiry,
                fileUrl: document.fileUrl
            }
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        if (req.file) {
            try {
                fs.unlinkSync(path.join(uploadDir, req.file.filename));
                console.log('Deleted uploaded file after error');
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
});


app.get('/api/documents', async (req, res) => {
    try {
        const documents = await Document.find().sort({ createdAt: -1 });
        res.json({ documents });
  } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});


app.delete('/api/documents/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = path.join(__dirname, 'public', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

        await document.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});


app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true, 
            fileUrl,
            filename: req.file.originalname
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});


app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await Message.distinct('room');
        console.log('Found rooms:', rooms);
        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
    res.status(500).json({ 
            error: 'Failed to fetch rooms',
            details: error.message 
    });
  }
});

app.get('/api/messages', async (req, res) => {
    try {
        const { page = 1, room, type, date } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        let query = {};
        if (room) query.room = room;
        if (type) query.type = type;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.timestamp = { $gte: startDate, $lt: endDate };
        }

        console.log('Querying messages with:', query);

        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Message.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        console.log(`Found ${messages.length} messages`);

    res.json({
            messages,
            totalPages,
            currentPage: parseInt(page)
    });
  } catch (error) {
        console.error('Error fetching messages:', error);
    res.status(500).json({ 
            error: 'Failed to fetch messages',
            details: error.message 
    });
  }
});

app.get('/api/stats', async (req, res) => {
    try {
        const totalMessages = await Message.countDocuments();
        const activeRooms = await Message.distinct('room').count();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesToday = await Message.countDocuments({
            timestamp: { $gte: today }
        });

        res.json({
            totalMessages,
            activeRooms,
            messagesToday
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});


app.get('/api/traffic/:location', async (req, res) => {
    try {
        const { location } = req.params;
        console.log('Received traffic request for location:', location);
        

        const [lat, lng] = location.split(',').map(coord => parseFloat(coord));
        console.log('Parsed coordinates:', { lat, lng });

        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); 


        const cities = {
            'New York': {
                coords: { lat: 40.7128, lng: -74.0060 },
                patterns: {
                    weekday: {
                        '7-10': { status: 'heavy', speed: 8, delay: 60, message: 'Heavy NYC morning rush hour traffic. Expect significant delays on FDR Drive and West Side Highway.' },
                        '10-12': { status: 'moderate', speed: 15, delay: 35, message: 'Moderate traffic flow in NYC. Some delays on major routes.' },
                        '12-16': { status: 'moderate', speed: 20, delay: 25, message: 'Normal NYC traffic conditions. Minor delays possible.' },
                        '16-19': { status: 'heavy', speed: 10, delay: 55, message: 'Evening rush hour in NYC. Heavy congestion on bridges and tunnels.' },
                        '19-22': { status: 'moderate', speed: 18, delay: 30, message: 'Moderate evening traffic in NYC.' },
                        '22-7': { status: 'light', speed: 30, delay: 15, message: 'Light traffic conditions in NYC.' }
                    },
                    weekend: {
                        '9-12': { status: 'moderate', speed: 20, delay: 25, message: 'Weekend morning traffic in NYC.' },
                        '12-18': { status: 'moderate', speed: 18, delay: 30, message: 'Weekend afternoon traffic in NYC.' },
                        '18-22': { status: 'moderate', speed: 15, delay: 35, message: 'Weekend evening traffic in NYC.' },
                        '22-9': { status: 'light', speed: 35, delay: 10, message: 'Light weekend traffic in NYC.' }
                    }
                }
            },
            'San Francisco': {
                coords: { lat: 37.7749, lng: -122.4194 },
                patterns: {
                    weekday: {
                        '7-10': { status: 'heavy', speed: 12, delay: 45, message: 'Morning commute in SF. Heavy Bay Bridge traffic.' },
                        '10-12': { status: 'moderate', speed: 20, delay: 25, message: 'Moderate traffic flow in SF.' },
                        '12-16': { status: 'moderate', speed: 25, delay: 20, message: 'Normal SF traffic conditions.' },
                        '16-19': { status: 'heavy', speed: 15, delay: 40, message: 'Evening commute in SF. Expect delays on 101 and 280.' },
                        '19-22': { status: 'moderate', speed: 22, delay: 25, message: 'Moderate evening traffic in SF.' },
                        '22-7': { status: 'light', speed: 35, delay: 10, message: 'Light traffic conditions in SF.' }
                    },
                    weekend: {
                        '9-12': { status: 'moderate', speed: 25, delay: 20, message: 'Weekend morning traffic in SF.' },
                        '12-18': { status: 'moderate', speed: 22, delay: 25, message: 'Weekend afternoon traffic in SF.' },
                        '18-22': { status: 'moderate', speed: 20, delay: 30, message: 'Weekend evening traffic in SF.' },
                        '22-9': { status: 'light', speed: 40, delay: 5, message: 'Light weekend traffic in SF.' }
                    }
                }
            },
            'Guntur': {
                coords: { lat: 16.3067, lng: 80.4365 },
                patterns: {
                    weekday: {
                        '8-11': { status: 'heavy', speed: 15, delay: 40, message: 'Morning rush hour in Guntur. Heavy traffic on main roads.' },
                        '11-14': { status: 'moderate', speed: 25, delay: 20, message: 'Moderate traffic flow in Guntur.' },
                        '14-17': { status: 'moderate', speed: 22, delay: 25, message: 'Normal traffic conditions in Guntur.' },
                        '17-20': { status: 'heavy', speed: 18, delay: 35, message: 'Evening rush hour in Guntur.' },
                        '20-22': { status: 'moderate', speed: 25, delay: 20, message: 'Moderate evening traffic in Guntur.' },
                        '22-8': { status: 'light', speed: 35, delay: 10, message: 'Light traffic conditions in Guntur.' }
                    },
                    weekend: {
                        '9-12': { status: 'moderate', speed: 25, delay: 20, message: 'Weekend morning traffic in Guntur.' },
                        '12-18': { status: 'moderate', speed: 22, delay: 25, message: 'Weekend afternoon traffic in Guntur.' },
                        '18-21': { status: 'moderate', speed: 20, delay: 30, message: 'Weekend evening traffic in Guntur.' },
                        '21-9': { status: 'light', speed: 40, delay: 5, message: 'Light weekend traffic in Guntur.' }
                    }
                }
            }
        };

        
        let currentCity = null;
        let minDistance = Infinity;

        for (const [city, data] of Object.entries(cities)) {
            const distance = Math.sqrt(
                Math.pow(data.coords.lat - lat, 2) + 
                Math.pow(data.coords.lng - lng, 2)
            ) * 111; 
            if (distance < minDistance) {
                minDistance = distance;
                currentCity = city;
            }
        }

        
        let trafficData;
        if (currentCity && minDistance < 50) { 
            const cityData = cities[currentCity];
            const isWeekday = day >= 1 && day <= 5;
            const patterns = cityData.patterns[isWeekday ? 'weekday' : 'weekend'];
            
            
            for (const [timeRange, pattern] of Object.entries(patterns)) {
                const [start, end] = timeRange.split('-').map(Number);
                if (hour >= start && hour < end) {
                    trafficData = {
                        ...pattern,
                        city: currentCity,
                        timePeriod: getTimePeriod(hour),
                        expectedImprovement: getExpectedImprovement(hour, day, currentCity)
                    };
                    break;
                }
            }
        } else {
           
            const defaultPatterns = {
                weekday: {
                    '8-11': { status: 'heavy', speed: 15, delay: 45, message: 'Heavy morning traffic expected.' },
                    '11-17': { status: 'moderate', speed: 25, delay: 20, message: 'Moderate traffic flow.' },
                    '17-20': { status: 'heavy', speed: 18, delay: 40, message: 'Evening rush hour traffic.' },
                    '20-8': { status: 'light', speed: 35, delay: 10, message: 'Light traffic conditions.' }
                },
                weekend: {
                    '9-12': { status: 'moderate', speed: 25, delay: 20, message: 'Weekend morning traffic.' },
                    '12-18': { status: 'moderate', speed: 22, delay: 25, message: 'Weekend afternoon traffic.' },
                    '18-21': { status: 'moderate', speed: 20, delay: 30, message: 'Weekend evening traffic.' },
                    '21-9': { status: 'light', speed: 40, delay: 5, message: 'Light weekend traffic.' }
                }
            };

            const isWeekday = day >= 1 && day <= 5;
            const patterns = defaultPatterns[isWeekday ? 'weekday' : 'weekend'];
            
            for (const [timeRange, pattern] of Object.entries(patterns)) {
                const [start, end] = timeRange.split('-').map(Number);
                if (hour >= start && hour < end) {
                    trafficData = {
                        ...pattern,
                        city: 'Other Location',
                        timePeriod: getTimePeriod(hour),
                        expectedImprovement: getExpectedImprovement(hour, day)
                    };
                    break;
                }
            }
        }

        const response = {
            location: { lat, lng },
            trafficFlow: {
                status: trafficData.status,
                speed: trafficData.speed,
                delay: trafficData.delay,
                lastUpdated: now.toISOString(),
                message: trafficData.message,
                details: {
                    city: trafficData.city,
                    timePeriod: trafficData.timePeriod,
                    expectedImprovement: trafficData.expectedImprovement
                }
            }
        };
        
        console.log('Sending traffic data:', response);
        res.json(response);
  } catch (error) {
        console.error('Error in traffic endpoint:', error);
    res.status(500).json({ 
            error: 'Failed to fetch traffic data',
            details: error.message 
    });
  }
});


function getTimePeriod(hour) {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
}


function getExpectedImprovement(hour, day, city) {
    const isWeekday = day >= 1 && day <= 5;
    
    if (city === 'New York') {
        if (isWeekday) {
            if (hour >= 7 && hour <= 10) return 'Expected to improve after 10:30 AM';
            if (hour >= 16 && hour <= 19) return 'Expected to improve after 7:30 PM';
        } else {
            if (hour >= 9 && hour <= 12) return 'Expected to improve after 12:30 PM';
            if (hour >= 18 && hour <= 22) return 'Expected to improve after 10:30 PM';
        }
    } else if (city === 'San Francisco') {
        if (isWeekday) {
            if (hour >= 7 && hour <= 10) return 'Expected to improve after 10:30 AM';
            if (hour >= 16 && hour <= 19) return 'Expected to improve after 7:30 PM';
        } else {
            if (hour >= 9 && hour <= 12) return 'Expected to improve after 12:30 PM';
            if (hour >= 18 && hour <= 22) return 'Expected to improve after 10:30 PM';
        }
    } else if (city === 'Guntur') {
        if (isWeekday) {
            if (hour >= 8 && hour <= 11) return 'Expected to improve after 11:30 AM';
            if (hour >= 17 && hour <= 20) return 'Expected to improve after 8:30 PM';
        } else {
            if (hour >= 9 && hour <= 12) return 'Expected to improve after 12:30 PM';
            if (hour >= 18 && hour <= 21) return 'Expected to improve after 9:30 PM';
        }
    }
    
    return 'Traffic conditions stable';
}


app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


const messageSchema = new mongoose.Schema({
    room: String,
    user: String,
    content: String,
    type: {
        type: String,
        default: 'text'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Message = mongoose.model('Message', messageSchema);


io.on('connection', (socket) => {
    console.log('User connected');

    
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    
    socket.on('message', async (data) => {
        try {
            const message = new Message({
                room: data.room,
                user: data.user,
                content: data.content,
                type: data.type || 'text',
                timestamp: new Date()
            });

            await message.save();
            
            
            io.to(data.room).emit('message', message);
            
            
            io.to('admin-room').emit('message', message);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

   
    socket.on('send_file', async (data) => {
        try {
           
            const message = new Message({
                room: data.room,
                user: data.user,
                content: data.fileUrl,
                type: 'file',
                filename: data.filename,
                timestamp: new Date()
            });
            await message.save();

           
            io.to(data.room).emit('receive_file', {
                sender: data.user,
                fileUrl: data.fileUrl,
                filename: data.filename,
                timestamp: message.timestamp
            });
            
            
            io.to('admin-room').emit('message', message);
        } catch (error) {
            console.error('Error handling file:', error);
            socket.emit('file_error', { error: 'Failed to process file' });
        }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        socket.to(data.room).emit('user_typing', {
            user: data.user,
            isTyping: data.isTyping
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Handle admin replies
    socket.on('admin:reply', async (data) => {
        try {
            const message = new Message({
                room: data.room,
                user: 'Jarvis',
                content: data.message,
                type: 'text',
                timestamp: new Date()
            });

            await message.save();
            
            // Emit to specific room
            io.to(data.room).emit('message', message);
            
            // Also emit to admin room
            io.to('admin-room').emit('message', message);
            
            // Notify admin that reply was sent
            socket.emit('admin:reply', {
                success: true,
                message: 'Reply sent successfully',
                room: data.room,
                _id: message._id
            });
        } catch (error) {
            console.error('Error sending admin reply:', error);
            socket.emit('admin:reply', {
                success: false,
                error: 'Failed to send reply'
            });
        }
    });
});

// Charging Stations Endpoints
app.get('/api/charging-stations/geocode', async (req, res) => {
    try {
        const { location } = req.query;
        const apiKey = process.env.TOMTOM_API_KEY || 'zwGGG06zs0mXuqcFG2KLd9ysNiIxpuxY';
        const geoURL = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.JSON?key=${apiKey}`;
        
        const response = await fetch(geoURL);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error in geocoding:', error);
        res.status(500).json({ error: 'Failed to geocode location' });
    }
});

app.get('/api/charging-stations/search', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = process.env.TOMTOM_API_KEY || 'zwGGG06zs0mXuqcFG2KLd9ysNiIxpuxY';
        const poiURL = `https://api.tomtom.com/search/2/poiSearch/charging station.JSON?lat=${lat}&lon=${lon}&radius=10000&key=${apiKey}`;
        
        const response = await fetch(poiURL);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error in POI search:', error);
        res.status(500).json({ error: 'Failed to find charging stations' });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});