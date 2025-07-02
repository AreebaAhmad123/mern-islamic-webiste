import mongoose from 'mongoose';
import 'dotenv/config';
import Notification from './Schema/Notification.js';
import User from './Schema/User.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function testNotifications() {
    try {
        console.log('🔍 Testing Notifications System...\n');

        // Check total notifications
        const totalNotifications = await Notification.countDocuments();
        console.log(`📊 Total notifications in database: ${totalNotifications}`);

        // Check notifications by type
        const likeNotifications = await Notification.countDocuments({ type: 'like' });
        const commentNotifications = await Notification.countDocuments({ type: 'comment' });
        const replyNotifications = await Notification.countDocuments({ type: 'reply' });
        const newUserNotifications = await Notification.countDocuments({ type: 'new_user' });

        console.log(`❤️  Like notifications: ${likeNotifications}`);
        console.log(`💬 Comment notifications: ${commentNotifications}`);
        console.log(`↩️  Reply notifications: ${replyNotifications}`);
        console.log(`👤 New user notifications: ${newUserNotifications}`);

        // Check unread notifications
        const unreadNotifications = await Notification.countDocuments({ seen: false });
        console.log(`🔴 Unread notifications: ${unreadNotifications}`);

        // Get a sample notification with populated data
        const sampleNotification = await Notification.findOne()
            .populate("user", "personal_info.fullname personal_info.username")
            .populate("blog", "blog_id title")
            .populate("comment", "comment")
            .populate("reply", "comment");

        if (sampleNotification) {
            console.log('\n📋 Sample notification:');
            console.log(`   Type: ${sampleNotification.type}`);
            console.log(`   Seen: ${sampleNotification.seen}`);
            console.log(`   Created: ${sampleNotification.createdAt}`);
            if (sampleNotification.user) {
                console.log(`   User: ${sampleNotification.user.personal_info?.fullname} (@${sampleNotification.user.personal_info?.username})`);
            }
            if (sampleNotification.blog) {
                console.log(`   Blog: ${sampleNotification.blog.title}`);
            }
        }

        // Check users
        const totalUsers = await User.countDocuments();
        console.log(`\n👥 Total users: ${totalUsers}`);

        // Check admin users
        const adminUsers = await User.find({ admin: true });
        console.log(`👑 Admin users: ${adminUsers.length}`);
        adminUsers.forEach(admin => {
            console.log(`   - ${admin.personal_info?.fullname} (@${admin.personal_info?.username})`);
        });

        console.log('\n✅ Notifications test completed!');

    } catch (error) {
        console.error('❌ Error testing notifications:', error);
    } finally {
        mongoose.disconnect();
    }
}

testNotifications(); 