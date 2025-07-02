import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import getDay from "../common/date";
import NotificationCommentField from "./notification-comment-field.component";
import { UserContext } from "../App";
import axios from "axios";
import { toast } from "react-hot-toast";

const NotificationCard = ({ data, index, notificationState }) => {

    const [isReplying, setIsReplying] = useState(false);
    let { seen, type, reply, createdAt, comment, replied_on_comment, user, blog, _id: notification_id } = data;
    

    

    
    // Safely extract user info
    const fullname = user?.personal_info?.fullname || user?.fullname || 'Unknown User';
    const username = user?.personal_info?.username || user?.username || 'unknown';
    const profile_img = user?.personal_info?.profile_img || user?.profile_img;
    
    // Safely extract blog info
    const blog_id = blog?.blog_id || blog?._id;
    const title = blog?.title || 'Unknown Blog';
    const blog_id_for_link = blog?.blog_id || blog?._id;

    let { userAuth } = useContext(UserContext);
    let author_username = userAuth?.personal_info?.username || userAuth?.username;
    let author_profile_img = userAuth?.personal_info?.profile_img || userAuth?.profile_img;
    let access_token = userAuth?.access_token;
    const isAdmin = userAuth?.isAdmin || userAuth?.admin || userAuth?.role === 'admin';

    let { notifications, notifications: {results, totalDocs} , setNotifications} = notificationState;

    const handleReplyClick = () => {
        setIsReplying(preval => !preval);
    }

    // Add this handler for notification deletion
    const handleDeleteNotification = (notification_id, target) => {
        if (!notification_id) {
            toast.error('Invalid notification ID. Cannot delete.');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this notification?')) {
            return;
        }
        target.setAttribute("disabled", true);
        axios.delete(`${import.meta.env.VITE_SERVER_DOMAIN}/delete-notification/${notification_id}`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(({ data }) => {
            if (data.success) {
                results.splice(index, 1);
                setNotifications({ ...notifications, results, totalDocs: totalDocs - 1, deletedDocCount: (notifications.deletedDocCount || 0) + 1 })
                toast.success('Notification deleted successfully!');
            }
            target.removeAttribute("disabled");
        })
        .catch(err => {
            console.error('Error deleting notification:', err);
            target.removeAttribute("disabled");
            if (err.response?.status === 401) {
                toast.error('Authentication failed. Please log in again.');
            } else if (err.response?.status === 403) {
                toast.error('You do not have permission to delete this notification.');
            } else if (err.response?.status === 404) {
                toast.error('Notification not found. It may have already been deleted.');
            } else {
                toast.error('Failed to delete notification. Please try again.');
            }
        });
    }

    // For non-admin users, only show reply notifications
    if (!isAdmin && type !== 'reply') {
        return null;
    }

    return (
        <div className={"p-6 border-b border-grey border-1-black" + (!seen ? "border-1-2" : "")}>
            <div className="flex gap-5 mb-3">
                <img src={profile_img || '/src/imgs/user profile.png'} className="w-14 h-14 flex-none rounded-full" alt={fullname} />
                <div className="w-full">
                    <h1 className="font-medium text-xl text-dark-grey">
                        <span className="lg:inline-block hidden capitalize">{fullname}</span>
                        <Link to={`/user/${username}`} className="mx-1 text-black underline">@{username}</Link>
                        <span className="font-normal">
                            {
                                type === 'new_user' ? (
                                    <span className="text-green-700">has signed up as a new user!</span>
                                ) :
                                !isAdmin ? "replied on" :
                                type === 'like' ? "liked your blog" :
                                    type === 'comment' ? "commented on" :
                                        "replied on"
                            }
                        </span>
                    </h1>
                    {
                        type === 'new_user' ? null :
                        (!isAdmin || type === "reply") ?
                            <div className="p-4 mt-4 rounded-md bg-grey">
                                <p>{replied_on_comment?.comment || 'Original comment not available'}</p>
                            </div>
                            :
                            <Link to={`/blog/${blog_id_for_link}`} className="font-medium text-dark-grey hover:underline line-clamp-1">{title}</Link>
                    }
                </div>
            </div>

            {
                type === 'new_user' ? (
                    <p className="ml-14 pl-5 font-gelasio text-xl my-5 text-green-700">
                        A new user has signed up: <b>{fullname}</b> (@{username})
                    </p>
                ) :
                (!isAdmin && type === 'reply' && comment) ?
                    <p className="ml-14 pl-5 font-gelasio text-xl my-5">
                        {comment.comment || 'Comment content not available'}
                    </p>
                    : !isAdmin && type === 'reply' && !comment ?
                    <p className="ml-14 pl-5 font-gelasio text-xl my-5 text-dark-grey italic">
                        Comment has been deleted
                    </p>
                    : isAdmin && type !== 'like' && comment ?
                    <p className="ml-14 pl-5 font-gelasio text-xl my-5">
                        {comment.comment || 'Comment content not available'}
                    </p>
                    : isAdmin && type !== 'like' && !comment ?
                    <p className="ml-14 pl-5 font-gelasio text-xl my-5 text-dark-grey italic">
                        Comment has been deleted
                    </p>
                    : ""
            }
            <p className="ml-14 pl-5 mt-3">{getDay(createdAt)}</p>
            {
                !isAdmin && type === 'reply' ?
                    <div className="ml-14 pl-5 mt-3 flex gap-8">
                      {reply && reply._id ? (
                        <>
                          <button className="underline hover:text-black px-2 py-1" onClick={handleReplyClick}>
                            Edit
                          </button>
                          <button className="underline hover:text-black px-2 py-1" onClick={handleReplyClick}>
                            Reply
                          </button>
                        </>
                      ) : (
                        <button className="underline hover:text-black px-2 py-1" onClick={handleReplyClick}>
                          Reply
                        </button>
                      )}
                    </div>
                    : isAdmin && type !== 'like' && type !== 'new_user' ?
                    <div className="ml-14 pl-5 mt-3 flex gap-8">
                      {reply && reply._id ? (
                        <>
                          <button className="underline hover:text-black px-2 py-1" onClick={handleReplyClick}>
                            Edit
                          </button>
                          <button className="underline hover:text-black px-2 py-1" onClick={handleReplyClick}>
                            Reply
                          </button>
                        </>
                      ) : (
                        <button className="underline hover:text-black px-2 py-1" onClick={handleReplyClick}>
                          Reply
                        </button>
                      )}
                    </div>
                    : ""
            }
            <div className="ml-14 pl-5 mt-3 flex gap-8">
                {(notification_id && (userAuth?._id === user?._id || userAuth?.isAdmin)) && (
                    <button className="text-red-500 underline hover:text-red-700 font-medium px-2 py-1" style={{color: '#ef4444'}} onClick={(e)=> handleDeleteNotification(notification_id, e.target)}>Delete Notification</button>
                )}
            </div>
            {
                isReplying ?
                    <div className="mt-8">
                        <NotificationCommentField
                            _id={blog_id}
                            blog_author={user}
                            index={index}
                            replyingTo={comment?._id}
                            setReplying={setIsReplying}
                            notification_id={notification_id}
                            notificationData={notificationState}
                        />
                    </div>
                    : ""
            }
            {
                reply && reply._id ?
                    <div className="ml-14 pl-5 mt-4 p-4 bg-grey/30 rounded-md border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-2">
                            <img src={author_profile_img || '/src/imgs/user profile.png'} className="w-6 h-6 rounded-full" alt={author_username} />
                            <span className="text-sm text-dark-grey">
                                <Link to={`/user/${author_username}`} className="font-medium text-black underline">
                                    {author_username}
                                </Link>
                                <span className="ml-1">replied:</span>
                            </span>
                        </div>
                        <p className="font-gelasio text-lg ml-8">{reply.comment || 'Reply content not available'}</p>
                    </div> : reply === null ? 
                    <div className="ml-14 pl-5 mt-4 p-3 bg-grey/20 rounded-md text-center">
                        <p className="text-dark-grey italic text-sm">Reply has been deleted</p>
                    </div> : ""
            }

        </div>
    )
}
export default NotificationCard;
