import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import BlogEditor from "../components/blog-editor.component";
import PublishForm from "../components/publish-form.component";
import { createContext } from "react";
import Loader, { EditorErrorBoundary } from "../components/loader.component";
import axios from "axios";

const blogStructure = {
    title: '',
    banner: '',
    content: [{ time: Date.now(), blocks: [], version: '2.27.2' }],
    tags: [],
    des: '',
    author: { personal_info: {} }
}

export const EditorContext = createContext({});

const Editor = () => {
    let { blog_id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(blogStructure);
    const [editorState, setEditorState] = useState("editor");
    const [textEditor, setTextEditor] = useState({ isReady: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { userAuth = {} } = useContext(UserContext);
    const { access_token, isAdmin } = userAuth;

    useEffect(() => {
        console.log("Editor component mounted with blog_id:", blog_id);
        console.log("Current userAuth:", userAuth);
        console.log("Current access_token:", access_token);

        if (!blog_id) {
            console.log("No blog_id provided, initializing empty editor");
            setLoading(false);
            setBlog(blogStructure);
            return;
        }

        if (!access_token) {
            console.log("No access token available");
            setError("Authentication required. Please log in to continue.");
            setLoading(false);
            return;
        }

        // Check admin status early
        if (!isAdmin) {
            setError("Access denied. Admin privileges required to edit blogs.");
            setLoading(false);
            return;
        }

        let isMounted = true;
        const abortController = new AbortController();

        const fetchBlog = async () => {
            try {
                console.log("Fetching blog with ID:", blog_id);
                const headers = {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                };
                console.log("Request headers:", headers);

                const response = await axios.post(
                    import.meta.env.VITE_SERVER_DOMAIN + "/get-blog",
                    {
                        blog_id,
                        draft: true,
                        mode: 'edit'
                    },
                    { 
                        headers, 
                        signal: abortController.signal,
                        timeout: 10000 // 10 second timeout
                    }
                );

                console.log("Server response:", response.data);

                if (isMounted) {
                    if (response.data.blog) {
                        const fetchedBlog = response.data.blog;
                        console.log("Raw fetched blog data:", fetchedBlog);

                        // Ensure content has the correct structure
                        let formattedContent;
                        if (!fetchedBlog.content) {
                            formattedContent = [{
                                time: Date.now(),
                                blocks: [],
                                version: '2.27.2'
                            }];
                        } else if (!Array.isArray(fetchedBlog.content)) {
                            // Handle old format where content was an object
                            formattedContent = [{
                                time: Date.now(),
                                blocks: fetchedBlog.content.blocks || [],
                                version: '2.27.2'
                            }];
                        } else if (fetchedBlog.content.length === 0) {
                            formattedContent = [{
                                time: Date.now(),
                                blocks: [],
                                version: '2.27.2'
                            }];
                        } else {
                            // Ensure each content item has the required fields
                            formattedContent = fetchedBlog.content.map(content => {
                                console.log("Processing content item:", content);
                                return {
                                    time: content.time || Date.now(),
                                    blocks: Array.isArray(content.blocks) ? content.blocks : [],
                                    version: content.version || '2.27.2'
                                };
                            });
                        }

                        const formattedBlog = {
                            ...fetchedBlog,
                            content: formattedContent
                        };

                        console.log("Formatted blog data:", formattedBlog);
                        console.log("Content structure:", formattedBlog.content);
                        console.log("First content item:", formattedBlog.content[0]);
                        console.log("Blocks in first content item:", formattedBlog.content[0]?.blocks);

                        setBlog(formattedBlog);
                        setError(null);
                    } else {
                        console.error("No blog data in response");
                        setError("Blog not found or you don't have permission to edit this blog.");
                        setBlog(null);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error fetching blog:", err);
                    if (err.response) {
                        console.error("Error response:", err.response.data);
                        console.error("Error status:", err.response.status);
                        console.error("Error headers:", err.response.headers);
                        
                        if (err.response.status === 401) {
                            setError("Authentication expired. Please log in again.");
                        } else if (err.response.status === 403) {
                            setError("You don't have permission to edit this blog.");
                        } else if (err.response.status === 404) {
                            setError("Blog not found.");
                        } else {
                            setError("Failed to load blog. Please try again.");
                        }
                    } else if (err.code === 'ECONNABORTED') {
                        setError("Request timed out. Please check your connection and try again.");
                    } else {
                        setError("Failed to load blog. Please try again.");
                    }
                    setBlog(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchBlog();
        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [blog_id, access_token, isAdmin, userAuth]);

    if (!access_token) {
        console.log("No access token, redirecting to login");
        return <Navigate to="/login" replace />;
    }

    if (loading) {
        console.log("Loading state active");
        return <Loader />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Access Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn-dark px-4 py-2"
                        >
                            Try Again
                        </button>
                        <button 
                            onClick={() => window.history.back()} 
                            className="btn-light px-4 py-2"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-6xl mb-4">🚫</div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Access Denied</h2>
                    <p className="text-gray-600 mb-6">You need admin privileges to access the editor.</p>
                    <button 
                        onClick={() => window.history.back()} 
                        className="btn-dark px-4 py-2"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (blog === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-6xl mb-4">📝</div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Blog Not Found</h2>
                    <p className="text-gray-600 mb-6">The blog you're looking for doesn't exist or you don't have permission to edit it.</p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => navigate("/editor")} 
                            className="btn-dark px-4 py-2"
                        >
                            Create New Blog
                        </button>
                        <button 
                            onClick={() => window.history.back()} 
                            className="btn-light px-4 py-2"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    console.log("Rendering editor with blog data:", blog);

    return (
        <EditorErrorBoundary>
            <EditorContext.Provider value={{ blog, setBlog, editorState, setEditorState, textEditor, setTextEditor }}>
                <div className="editor-page">
                    {
                        !access_token ? <Navigate to="/login" />
                            : loading ? <Loader />
                                :
                                editorState == "editor" ? <BlogEditor /> : <PublishForm />
                    }
                </div>
            </EditorContext.Provider>
        </EditorErrorBoundary>
    );
}

export default Editor;
