import { useNavigate, useParams } from "react-router-dom";
import defaultBanner from "../imgs/blog banner.png";
import AnimationWrapper from "../common/page-animation";
import EditorJS from "@editorjs/editorjs";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import { tools } from "./tools.component";
import { EditorContext } from "../pages/editor.pages.jsx";
import axios from "axios";
import { lookInSession } from "../common/session";
import { UserContext } from "../App";
import { uploadImage } from "../common/cloudinary";

// Debug EditorJS import
console.log("EditorJS import check:", {
  EditorJS: typeof EditorJS,
  isFunction: typeof EditorJS === 'function',
  isConstructor: EditorJS && EditorJS.prototype && EditorJS.prototype.constructor === EditorJS
});

const BlogEditor = () => {
  const { blog, setBlog, setEditorState } = useContext(EditorContext);
  const { userAuth = {} } = useContext(UserContext);
  const isAdmin = userAuth.isAdmin;
  const [title, setTitle] = useState("");
  const [banner, setBanner] = useState("");
  const [des, setDes] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [saveError, setSaveError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef(null);
  const textEditorRef = useRef(null);
  const navigate = useNavigate();
  const { blogId } = useParams();
  const access_token = userAuth.access_token || null;
  const [authChecked, setAuthChecked] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  // Auth check and show toast before navigating
  useEffect(() => {
    if (!access_token) {
      toast.error("Authentication required. Please log in.");
      setTimeout(() => navigate("/login"), 1000);
    } else {
      setAuthChecked(true);
    }
  }, [access_token, navigate]);

  // Check if we're in edit mode
  useEffect(() => {
    if (blogId) {
      setIsEditing(true);
    }
  }, [blogId]);

  // Initialize local state from blog context on mount or when blog changes
  useEffect(() => {
    if (blog) {
      setTitle(blog.title || "");
      setBanner(blog.banner || "");
      setDes(blog.des || "");
      setTags(blog.tags || []);
    }
  }, [blog]);

  // Debounced auto-save function
  const debouncedAutoSave = useCallback(async () => {
    if (!authChecked || !blog?.blog_id || isSaving) return;
    
    setAutoSaveStatus('saving');
    setSaveError(null);
    
    try {
      let content = null;
      if (editorRef.current?.isReady) {
        try {
          content = await editorRef.current.save();
        } catch (editorError) {
          console.warn("Auto-save: Editor save failed:", editorError);
          setAutoSaveStatus('error');
          setSaveError("Editor not ready");
          return;
        }
      } else {
        setAutoSaveStatus('error');
        setSaveError("Editor not ready");
        return;
      }

      // Validate content before sending
      if (!content || !content.blocks) {
        console.warn("Auto-save: Invalid content structure");
        setAutoSaveStatus('error');
        setSaveError("Invalid content structure");
        return;
      }

      // Only auto-save if there's actual content
      const hasContent = title.trim() || des.trim() || (content.blocks && content.blocks.length > 0);
      if (!hasContent) {
        setAutoSaveStatus('idle');
        return;
      }

      const blogObj = {
        title: title.trim() || "Untitled Draft",
        banner: banner.trim() || "",
        des: des.trim() || "",
        content: [content],
        tags: tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0),
        draft: true,
        id: blog.blog_id
      };

      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`,
        blogObj,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      setLastSaved(new Date());
      setAutoSaveStatus('saved');
      setSaveError(null);
      console.log("Auto-save completed successfully");
      
      // Reset status after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    } catch (error) {
      console.warn("Auto-save failed:", error);
      setAutoSaveStatus('error');
      
      let errorMessage = "Auto-save failed";
      if (error.response?.status === 401) {
        errorMessage = "Authentication expired";
      } else if (error.response?.status === 403) {
        errorMessage = "Permission denied";
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setSaveError(errorMessage);
      // Reset error status after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
        setSaveError(null);
      }, 5000);
    }
  }, [authChecked, blog?.blog_id, title, banner, des, tags, access_token, isSaving]);

  // Auto-save on content changes (debounced)
  useEffect(() => {
    if (!authChecked || !blog?.blog_id) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      debouncedAutoSave();
    }, 30000); // 30 seconds debounce

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [debouncedAutoSave, authChecked, blog?.blog_id]);

  // Initialize EditorJS only once
  useEffect(() => {
    if (!authChecked) return;
    if (editorRef.current) {
      console.log("Editor already initialized, skipping...");
      return; // Already initialized
    }
    if (!textEditorRef.current) {
      console.log("DOM node not available yet, waiting...");
      return; // DOM node not yet available
    }
    
    const editorData = blog?.content?.[0] || {
      time: Date.now(),
      blocks: [],
      version: '2.27.2'
    };
    
    console.log("Initializing EditorJS with data:", editorData);
    console.log("EditorJS import:", EditorJS);
    console.log("Tools import:", tools);
    
    // Validate that EditorJS is properly imported
    if (typeof EditorJS !== 'function') {
      console.error("EditorJS is not properly imported");
      toast.error("Editor failed to load. Please refresh the page.");
      return;
    }
    
    // Validate that tools are properly imported
    if (!tools || typeof tools !== 'object') {
      console.error("Tools are not properly imported");
      toast.error("Editor tools failed to load. Please refresh the page.");
      return;
    }
    
    // Additional validation for EditorJS constructor
    if (!EditorJS.prototype || !EditorJS.prototype.constructor) {
      console.error("EditorJS constructor is not properly defined");
      toast.error("Editor constructor failed to load. Please refresh the page.");
      return;
    }
    
    // Check if there's already an editor instance in the DOM
    const existingEditor = textEditorRef.current.querySelector('.codex-editor');
    if (existingEditor) {
      console.log("Editor instance already exists in DOM, cleaning up...");
      existingEditor.remove();
    }
    
    try {
      const editor = new EditorJS({
        holder: textEditorRef.current,
        data: editorData,
        tools: tools,
        placeholder: "Start writing your story here...",
        autofocus: true,
        readOnly: false,
        logLevel: "ERROR",
        onChange: async () => {
          try {
            if (editor.isReady) {
              const data = await editor.save();
              // Save to sessionStorage for immediate backup
              const blogData = {
                ...blog,
                title,
                banner,
                content: [{
                  ...data,
                  time: Date.now(),
                  version: '2.27.2'
                }],
                tags,
                des
              };
              sessionStorage.setItem("blog_draft", JSON.stringify(blogData));
            }
          } catch (error) {
            console.warn("Failed to save to sessionStorage:", error);
          }
        },
        onReady: () => {
          setEditorReady(true);
          setContentLoaded(true);
          console.log("Editor is ready");
        }
      });
      
      editorRef.current = editor;
      console.log("EditorJS instance created successfully");
    } catch (error) {
      console.error("EditorJS initialization failed:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.error("Failed to initialize editor. Please refresh the page.");
    }
    
    return () => {
      if (editorRef.current) {
        console.log("Cleaning up editor instance...");
        editorRef.current.isReady
          .then(() => editorRef.current.destroy())
          .catch(() => {});
        editorRef.current = null;
        setEditorReady(false);
        setContentLoaded(false);
      }
    };
  }, [authChecked, textEditorRef.current]);

  // Update editor data if blog.content changes (but don't re-create instance)
  useEffect(() => {
    if (editorRef.current && blog?.content?.[0] && editorReady && !contentLoaded) {
      // Only handle content updates if content hasn't been loaded yet
      // This prevents the render error and handles initial content loading properly
      console.log("Content updated - EditorJS content handled during initialization");
    }
  }, [blog?.content, editorReady, contentLoaded]);

  // Test upload service function
  const testUploadService = async () => {
    try {
      console.log("Testing upload service...");
      const response = await axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/test-upload`);
      console.log("Upload service test result:", response.data);
      return response.data.success;
    } catch (error) {
      console.error("Upload service test failed:", error);
      return false;
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, JPEG, and PNG files are allowed");
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    let loadingToast = toast.loading("Uploading banner image...");

    try {
      // Test upload service first
      const serviceWorking = await testUploadService();
      if (!serviceWorking) {
        throw new Error("Upload service is not available");
      }

      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log("Starting upload, file size:", file.size, "bytes");

      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_DOMAIN}/upload-image`,
        { image: base64 },
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 90000 // 90 second timeout for image upload (increased from 30s)
        }
      );

      toast.dismiss(loadingToast);

      if (response.data.success === true) {
        const secureUrl = response.data.url;
        setBanner(secureUrl);
        setBlog({ ...blog, banner: secureUrl });
        toast.success("Banner uploaded successfully! 🎉");
      } else {
        toast.error("Failed to upload banner image");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Banner upload error:", error);
      
      let errorMessage = "Failed to upload banner image";
      if (error.response?.status === 401) {
        errorMessage = "Authentication expired. Please log in again.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Invalid image format";
      } else if (error.response?.status === 408) {
        errorMessage = "Upload timed out. Please try again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Upload timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDes(e.target.value);
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
        setTags([...tags, newTag]);
        setTagInput("");
      } else {
        toast.error("Duplicate tag");
      }
    }
  };

  const removeTag = (tag) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
  };

  const handleTitleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
    }
  };

  const handleError = (e) => {
    e.target.src = defaultBanner;
  };

  const handleSaveDraft = async (e) => {
    if (isSaving) return;
    
    // Validate minimum content requirements
    const hasTitle = title.trim().length > 0;
    const hasDescription = des.trim().length > 0;
    const hasContent = editorRef.current?.isReady && await editorRef.current.save().then(data => data.blocks && data.blocks.length > 0).catch(() => false);
    
    if (!hasTitle && !hasDescription && !hasContent) {
      return toast.error("Please add some content (title, description, or blog content) before saving as draft");
    }
    
    setIsSaving(true);
    let loadingToast = toast.loading(isEditing ? "Updating draft...." : "Saving draft....");
    
    try {
      // Get editor content if editor is ready
      let content = null;
      if (editorRef.current?.isReady) {
        try {
          content = await editorRef.current.save();
          // Validate content structure
          if (!content || !content.blocks) {
            content = { time: Date.now(), blocks: [], version: '2.27.2' };
          }
        } catch (editorError) {
          console.warn("Editor save failed, continuing with empty content:", editorError);
          content = { time: Date.now(), blocks: [], version: '2.27.2' };
        }
      } else {
        // If editor not ready, create empty content structure
        content = { time: Date.now(), blocks: [], version: '2.27.2' };
      }

      const blogObj = {
        title: title.trim() || "Untitled Draft",
        banner: banner.trim() || "",
        des: des.trim() || "",
        content: [content],
        tags: tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0),
        draft: true,
        id: blog?.blog_id || blogId || null
      };

      // Use different endpoints for new vs existing blogs
      const url = isEditing 
        ? `${import.meta.env.VITE_SERVER_DOMAIN}/update-blog/${blogId || blog?.blog_id}`
        : `${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`;

      const method = isEditing ? 'put' : 'post';

      const response = await axios[method](
        url,
        blogObj,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout for manual saves
        }
      );

      toast.dismiss(loadingToast);
      toast.success(isEditing ? "Draft updated successfully! 👍" : "Draft saved successfully! 👍");
      
      // Update the blog context with the saved draft data
      if (response.data.blog_id) {
        setBlog(prev => ({
          ...prev,
          blog_id: response.data.blog_id,
          ...blogObj
        }));
      }
      
      // Update save status
      setLastSaved(new Date());
      setAutoSaveStatus('saved');
      setSaveError(null);
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
      
      // Clear session storage draft since it's now saved to database
      sessionStorage.removeItem("blog_draft");
      
      setTimeout(() => {
        navigate("/dashboard/blogs?tab=draft");
      }, 500);
    } catch (error) {
      toast.dismiss(loadingToast);
      
      let errorMessage = isEditing ? "Failed to update draft" : "Failed to save draft";
      if (error.response?.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to save drafts.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Invalid draft data";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Save timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error("Draft save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishEvent = async () => {
    console.log("Publish button clicked in BlogEditor");
    console.log("Current blog state:", blog);
    console.log("Editor ref ready:", editorRef.current?.isReady);
    
    // Validate all required fields for publishing
    if (!banner) {
      console.log("Validation failed: No banner");
      return toast.error("Upload a blog banner to publish it");
    }
    if (!title.trim()) {
      console.log("Validation failed: No title");
      return toast.error("Write blog title to publish it");
    }
    if (!des.trim()) {
      console.log("Validation failed: No description");
      return toast.error("Write blog description to publish it");
    }
    if (des.trim().length > 200) {
      console.log("Validation failed: Description too long");
      return toast.error("Description cannot exceed 200 characters");
    }
    if (!tags.length) {
      console.log("Validation failed: No tags");
      return toast.error("Add at least one tag to publish it");
    }
    
    try {
      if (!editorRef.current?.isReady) {
        console.log("Editor not ready");
        throw new Error("Editor not ready");
      }
      
      const data = await editorRef.current.save();
      console.log("Editor save data:", data);
      
      if (!data.blocks?.length) {
        console.log("Validation failed: No content blocks");
        return toast.error("Write something in your blog to publish it");
      }
      
      const blogData = {
        title: title.trim(),
        banner: banner.trim(),
        content: [{
          time: data.time || Date.now(),
          blocks: Array.isArray(data.blocks) ? data.blocks : [],
          version: data.version || '2.27.2'
        }],
        tags: tags.map(tag => tag.trim().toLowerCase()),
        des: des.trim(),
        id: blog?.blog_id || blogId || null
      };
      
      console.log("Setting blog data for publish form:", blogData);
      setBlog(blogData);
      setEditorState("publish");
      sessionStorage.setItem("blog_draft", JSON.stringify(blogData));
      sessionStorage.setItem("refresh_drafts", "1");
    } catch (err) {
      console.error("Error in handlePublishEvent:", err);
      toast.error("Failed to save blog content");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving) {
          handleSaveDraft();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaving]);

  // If blog is null, show error and do not render editor
  if (blog === null) {
    return <div style={{textAlign: 'center', marginTop: '3rem', color: 'red', fontSize: '1.5rem'}}>Blog not found or you do not have permission to edit this blog.</div>;
  }
  // Offer to restore draft if blog is null but draft exists in sessionStorage
  if (!blog && sessionStorage.getItem("blog_draft")) {
    return (
      <div style={{textAlign: 'center', marginTop: '3rem'}}>
        <div style={{color: 'red', fontSize: '1.5rem', marginBottom: '1rem'}}>No blog loaded, but a draft was found in your browser.</div>
        <div style={{marginBottom: '2rem', color: 'gray'}}>
          This could be due to a page refresh or navigation. You can restore your work from the saved draft.
        </div>
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
          <button 
            className="btn-dark px-6 py-3" 
            onClick={() => {
              try {
                const draft = JSON.parse(sessionStorage.getItem("blog_draft"));
                setBlog(draft);
                toast.success("Draft restored successfully!");
              } catch (error) {
                console.error("Failed to parse draft:", error);
                toast.error("Failed to restore draft. Starting fresh.");
                sessionStorage.removeItem("blog_draft");
                setBlog({});
              }
            }}
          >
            Restore Draft
          </button>
          <button 
            className="btn-light px-6 py-3" 
            onClick={() => {
              sessionStorage.removeItem("blog_draft");
              setBlog({});
              toast.success("Starting fresh!");
            }}
          >
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  if (!authChecked) return null;

  return (
    <>
      <nav className="navbar"></nav>
      <Toaster />
      <AnimationWrapper>
        <section className="w-full py-8 px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6 sm:mb-8 ml-28">
            <button
              className="btn-dark py-2 hidden md:block text-sm sm:text-base"
              onClick={handleSaveDraft}
              disabled={isSaving}
              title="Save draft (Ctrl+S / Cmd+S)"
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              className="btn-light py-2 hidden md:block text-sm sm:text-base"
              onClick={handlePublishEvent}
              disabled={!title.trim() || !des.trim() || !banner}
              title={!title.trim() || !des.trim() || !banner ? "Complete all required fields to publish" : "Publish blog"}
            >
              Publish
            </button>
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {autoSaveStatus === 'saving' && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Auto-saving...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Saved
                </span>
              )}
              {autoSaveStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-600" title={saveError}>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Save failed
                </span>
              )}
              {lastSaved && autoSaveStatus === 'idle' && (
                <span className="text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video hover:opacity-80 bg-white border-l border-gray-200 rounded-lg">
              <label htmlFor="uploadBanner">
                <img
                  src={banner || defaultBanner}
                  alt="Blog banner"
                  className="w-[500px] h-[500px] object-contain rounded-lg mx-auto bg-white"
                  onError={handleError}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                  <span className="text-white text-lg">Upload Banner</span>
                </div>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-lg z-10">
                    <span className="text-white text-lg animate-pulse">Uploading...</span>
                  </div>
                )}
              </label>
              <input
                type="file"
                id="uploadBanner"
                accept="image/*"
                hidden
                onChange={handleBannerUpload}
              />
            </div>
            <textarea
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              maxLength={100}
            ></textarea>
            <div className="text-right text-sm text-gray-500 mt-1">
              {title.length}/100 characters
            </div>
            <textarea
              value={des}
              placeholder="Blog Description"
              className="text-base sm:text-lg w-full h-20 outline-none resize-none mt-4 leading-tight placeholder:opacity-40"
              onChange={handleDescriptionChange}
              maxLength={200}
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {des.length}/200 characters
            </div>
            <div className="mt-4">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                Tags (Press Enter to add, max 5)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <div
                    key={tag + idx}
                    className="flex items-center bg-gray-100 text-gray-800 text-sm sm:text-base px-3 py-1 rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-red-500 hover:text-red-700"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
                maxLength={20}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {tags.length}/5 tags • {tagInput.length}/20 characters
              </div>
            </div>
            <hr className="w-full opacity-10 my-5" />
            <div ref={textEditorRef} className="font-gelasio"></div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;