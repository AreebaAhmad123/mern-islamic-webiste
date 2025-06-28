import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../App";
import { BlogContext } from "../pages/blog.page";
import getDay from "../common/date";

const CommentCard = ({ commentData, index, leftVal }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const { userAuth } = useContext(UserContext);
    const { blog, setBlog } = useContext(BlogContext);

    const { _id, comment, commented_by, commentedAt, children } = commentData;

    const canDelete = userAuth && (userAuth._id === commented_by._id || userAuth.role === 'admin');

    const handleDelete = async () => {
        if (!canDelete || !blog?._id) return;
        
        if (window.confirm('Are you sure you want to delete this comment?')) {
            setIsDeleting(true);
            try {
                const { data } = await axios.delete(
                    import.meta.env.VITE_SERVER_DOMAIN + "/delete-comment",
                    {
                        data: { comment_id: _id, blog_id: blog._id },
                        headers: {
                            'Authorization': `Bearer ${userAuth.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (data.success) {
                    // Update the blog state to remove the deleted comment
                    const updatedBlog = { ...blog };
                    if (updatedBlog.comments && updatedBlog.comments.results) {
                        updatedBlog.comments.results = updatedBlog.comments.results.filter(
                            (_, i) => i !== index
                        );
                    }
                    if (updatedBlog.activity) {
                        updatedBlog.activity.total_parent_comments = Math.max(0, updatedBlog.activity.total_parent_comments - 1);
                    }
                    setBlog(updatedBlog);
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border hover:shadow-sm transition-shadow" style={{ marginLeft: `${leftVal * 10}px` }}>
            <div className="flex items-start space-x-3">
                <img 
                    src={commented_by.profile_img || '/src/imgs/user profile.png'} 
                    alt={commented_by.fullname}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-800">
                                {commented_by.fullname}
                            </h4>
                            
                            {commented_by.role === 'admin' && (
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
    );
};

export default CommentCard;
