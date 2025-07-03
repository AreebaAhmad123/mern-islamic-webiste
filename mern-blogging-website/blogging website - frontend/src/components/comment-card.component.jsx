import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../App";
import { BlogContext } from "../pages/blog.page";
import getDay from "../common/date";
import { Toaster, toast } from "react-hot-toast";
import userProfile from "../imgs/user profile.png";

const CommentCard = ({ commentData, index, leftVal }) => {
    console.log('CommentCard received commentData:', commentData);
    if (!commentData || !commentData._id) return null;

    const [isDeleting, setIsDeleting] = useState(false);
    const { userAuth } = useContext(UserContext);
    const { blog, setBlog, fetchBlog } = useContext(BlogContext);

    const { _id, comment, commented_by, commentedAt, children } = commentData;

    const canDelete = userAuth && commented_by && (userAuth._id === commented_by._id || userAuth.role === 'admin' || userAuth.personal_info?.role === 'admin');

    const handleDelete = async () => {
        if (!canDelete || !blog?.blog_id) return;
        
        if (window.confirm('Are you sure you want to delete this comment?')) {
            setIsDeleting(true);
            try {
                const { data } = await axios.post(
                    import.meta.env.VITE_SERVER_DOMAIN + "/api/delete-comment",
                    { comment_id: _id, blog_id: blog.blog_id || blog._id },
                    {
                        headers: {
                            'Authorization': `Bearer ${userAuth.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (data.success) {
                    // Refresh the blog data to update comment count
                    if (typeof fetchBlog === 'function') {
                        await fetchBlog();
                    } else {
                        // fallback: update the blog state to remove the deleted comment
                        const updatedBlog = { ...blog };
                        if (updatedBlog.comments && updatedBlog.comments.results) {
                            updatedBlog.comments.results = updatedBlog.comments.results.filter(
                                (comment) => comment._id !== _id
                            );
                        }
                        setBlog(updatedBlog);
                    }
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
                if (error.response?.data?.error) {
                    toast.error('Error deleting comment: ' + error.response.data.error);
                } else {
                    toast.error('Failed to delete comment. Please try again.');
                }
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <>
            <Toaster />
            <div className="bg-white p-4 rounded-lg border hover:shadow-sm transition-shadow" style={{ marginLeft: `${leftVal * 10}px` }}>
            <div className="flex items-start space-x-3">
                <img 
                    src={commented_by?.personal_info?.profile_img || commented_by?.profile_img || userProfile} 
                    alt={commented_by?.personal_info?.fullname || commented_by?.fullname || 'User'}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-800">
                                {commented_by?.personal_info?.fullname || commented_by?.fullname || 'Unknown User'}
                            </h4>
                            
                            {commented_by?.role === 'admin' && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                                    Admin
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                                {getDay(commentedAt)}
                            </span>
                            
                            {canDelete && (
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50"
                                    title="Delete comment"
                                >
                                    {isDeleting ? 'Deleting...' : '🗑️'}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {comment}
                    </p>
                </div>
            </div>
        </div>
        </>
    );
};

export default CommentCard;
