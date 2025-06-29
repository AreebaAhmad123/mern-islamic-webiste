import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../pages/editor.pages.jsx";
import { UserContext } from "../App";
import axios from "axios";
import { lookInSession } from "../common/session";

const PublishForm = () => {
  const navigate = useNavigate();
  const characterLimit = 200;
  const { blog = {}, setBlog, setEditorState } = useContext(EditorContext);
  const { userAuth } = useContext(UserContext);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize tags from blog data
  useEffect(() => {
    if (blog?.tags) {
      setTags(blog.tags);
    }
  }, [blog?.tags]);

  // Validate blog data before publishing
  const validateBlogData = () => {
    console.log("Validating blog data:", blog);
    const errors = {};

    if (!blog.title?.trim()) {
      errors.title = "Blog title is required";
    } else if (blog.title.trim().length > 100) {
      errors.title = "Title cannot exceed 100 characters";
    }

    if (!blog.des?.trim()) {
      errors.description = "Blog description is required";
    } else if (blog.des.length > characterLimit) {
      errors.description = `Description cannot exceed ${characterLimit} characters (current: ${blog.des.length})`;
    }

    if (!blog.banner) {
      errors.banner = "Blog banner is required";
    }

    if (!blog.tags?.length) {
      errors.tags = "At least one tag is required";
    } else if (blog.tags.length > 5) {
      errors.tags = "Maximum 5 tags allowed";
    }

    // Validate EditorJS content
    const blocks = getContentBlocks(blog.content);
    console.log("Content blocks:", blocks);
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      errors.content = "Blog content is required";
    }

    console.log("Validation errors:", errors);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const publishBlog = async (e) => {
    e.preventDefault();
    
    console.log("Publish button clicked");
    console.log("Current blog data:", blog);
    console.log("Current userAuth:", userAuth);
    
    // Validate before publishing
    if (!validateBlogData()) {
      console.log("Validation failed");
      toast.error("Please fix the validation errors before publishing");
      return;
    }

    setIsLoading(true);

    // Get access token from UserContext (consistent with other components)
    const access_token = userAuth?.access_token;
    console.log("Access token available:", !!access_token);

    if (!access_token) {
      toast.error("Authentication required");
      navigate("/login");
      setIsLoading(false);
      return;
    }

    const loadingToast = toast.loading("Publishing...");

    try {
      // Prepare the blog data
      const blogData = {
        title: blog.title.trim(),
        des: blog.des.trim(),
        banner: blog.banner?.trim() || "",
        content: Array.isArray(blog.content) ? blog.content[0] : blog.content,
        tags: blog.tags.map(tag => tag.trim().toLowerCase()),
        draft: false,
        id: blog.blog_id
      };
      
      console.log("Prepared blog data for publishing:", blogData);

      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`,
        blogData,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout for publishing
        }
      );

      console.log("Publish response:", response.data);
      toast.dismiss(loadingToast);
      toast.success("Published successfully!");
      sessionStorage.removeItem("blog_draft");
      sessionStorage.setItem("refresh_drafts", "1");
      sessionStorage.setItem("refresh_published", "1");
      setTimeout(() => navigate("/dashboard/blogs"), 1500);
    } catch (error) {
      console.error("Publish error details:", error);
      toast.dismiss(loadingToast);
      
      let errorMessage = "Failed to publish";
      if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to publish blogs.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Invalid blog data";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      console.error("Publish error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseEvent = () => {
    setEditorState("editor");
    navigate("/editor");
  };

  const handleBlogTitleChange = (e) => {
    const newTitle = e.target.value;
    setBlog({ ...blog, title: newTitle });
    
    // Clear validation error when user starts typing
    if (validationErrors.title) {
      setValidationErrors(prev => ({ ...prev, title: null }));
    }
  };

  const handleDescriptionChange = (e) => {
    const newDes = e.target.value;
    setBlog({ ...blog, des: newDes });
    
    // Clear validation error when user starts typing
    if (validationErrors.description) {
      setValidationErrors(prev => ({ ...prev, description: null }));
    }
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (tags.length >= 5) {
        toast.error("Maximum 5 tags allowed");
        return;
      }
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.map(t => t.trim().toLowerCase()).includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        setBlog({ ...blog, tags: newTags });
        setTagInput("");
        
        // Clear validation error when tag is added
        if (validationErrors.tags) {
          setValidationErrors(prev => ({ ...prev, tags: null }));
        }
      } else {
        toast.error("Duplicate tag");
      }
    }
  };

  const removeTag = (tag) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    setBlog({ ...blog, tags: newTags });
  };

  // Accept both array and object for content
  const getContentBlocks = (content) => {
    if (!content) return null;
    
    try {
      if (Array.isArray(content)) {
        // If content is an array, get blocks from the first item
        return content[0]?.blocks || null;
      } else if (typeof content === 'object' && content !== null) {
        // If content is an object, get blocks directly
        return content.blocks || null;
      }
      return null;
    } catch (error) {
      console.error("Error parsing content blocks:", error);
      return null;
    }
  };

  if (!blog?.banner) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">🖼️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Banner Required</h2>
          <p className="text-gray-600 mb-6">A banner image is required to publish a blog.</p>
          <button className="btn-dark px-8" onClick={handleCloseEvent}>Back to Editor</button>
        </div>
      </div>
    );
  }

  return (
    <AnimationWrapper>
      <section className="w-full min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
        <Toaster />
        <button
          className="fixed top-4 right-4 z-50 bg-red-500 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center hover:bg-red-600 transition border-2 border-red-600"
          onClick={handleCloseEvent}
          disabled={isLoading}
          aria-label="Close publish form"
        >
          <span className="text-lg sm:text-xl">X</span>
        </button>

        <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">
          {/* Preview Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Preview</h2>
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={blog.banner}
                alt="Blog banner"
                className="w-full h-full object-cover"
                onError={(e) => (e.target.src = "/imgs/blog banner.png")}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-4 text-gray-900 line-clamp-2">
              {blog.title || "Untitled Blog"}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mt-2 line-clamp-3">
              {blog.des || "No description provided"}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 text-sm sm:text-base font-medium px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {/* Publish Button in Preview Section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={publishBlog}
                className={`w-full py-3 rounded-lg text-white font-semibold text-sm sm:text-base ${isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-yellow-400 hover:bg-yellow-500"
                  } transition`}
                disabled={isLoading}
              >
                {isLoading ? "Publishing..." : "🚀 Publish Blog"}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Review your blog details below before publishing
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Blog Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Blog Title
                </label>
                <input
                  type="text"
                  placeholder="Enter blog title"
                  value={blog.title || ""}
                  onChange={handleBlogTitleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base ${
                    validationErrors.title ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  maxLength={100}
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                )}
                <div className="text-right text-xs text-gray-500 mt-1">
                  {blog.title?.length || 0}/100 characters
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Write a short description"
                  value={blog.des || ""}
                  onChange={handleDescriptionChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 sm:h-32 resize-none text-sm sm:text-base ${
                    validationErrors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  maxLength={characterLimit}
                />
                {validationErrors.description && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
                )}
                <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                  <span>Current length: {blog.des?.length || 0} characters</span>
                  <span>Max: {characterLimit} characters</span>
                </div>
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Tags (Press Enter to add, max 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center bg-gray-100 text-gray-800 text-sm sm:text-base px-3 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        disabled={isLoading}
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagKeyDown}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base ${
                    validationErrors.tags ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  maxLength={20}
                />
                {validationErrors.tags && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.tags}</p>
                )}
                <div className="text-right text-xs text-gray-500 mt-1">
                  {tags.length}/5 tags • {tagInput.length}/20 characters
                </div>
              </div>
              {validationErrors.content && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{validationErrors.content}</p>
                </div>
              )}
              {validationErrors.banner && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{validationErrors.banner}</p>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </section>
    </AnimationWrapper>
  );
};

export default PublishForm;