const mongoose = require('mongoose');


mongoose.connect('mongodb://localhost:27017/drivedoc', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));


const messageSchema = new mongoose.Schema({
    sender: String,
    content: String,
    type: String,
    timestamp: Date,
    room: String
});

const Message = mongoose.model('Message', messageSchema);


async function viewMessages() {
    try {
        
        const messages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(50);

        console.log('\n=== Recent Chat Messages ===\n');
        
        messages.forEach((msg, index) => {
            console.log(`Message ${index + 1}:`);
            console.log(`Room: ${msg.room}`);
            console.log(`Sender: ${msg.sender}`);
            console.log(`Type: ${msg.type}`);
            console.log(`Timestamp: ${msg.timestamp}`);
            console.log(`Content: ${msg.content}`);
            if (msg.filename) {
                console.log(`Filename: ${msg.filename}`);
            }
            console.log('------------------------');
        });

        const totalMessages = await Message.countDocuments();
        const totalRooms = await Message.distinct('room').count();
        
        console.log('\n=== Chat Statistics ===');
        console.log(`Total Messages: ${totalMessages}`);
        console.log(`Total Chat Rooms: ${totalRooms}`);
        
    } catch (error) {
        console.error('Error viewing messages:', error);
    } finally {
        mongoose.connection.close();
    }
}


viewMessages(); 