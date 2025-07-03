import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/navbar.component.jsx";
import UserAuthForm from "./pages/userAuthForm.page.jsx";
import { createContext, useEffect, useState } from "react";
import { lookInSession } from "./common/session";
import { initializeUserAuth } from "./common/auth";
import "./common/axios-config"; // Initialize axios interceptors
import Editor from "./pages/editor.pages";
import HomePage from "./pages/home.page";
import SearchPage from "./pages/search.page";
import PageNotFound from "./pages/404.page";
import ProfilePage from "./pages/profile.page";
import BlogPage from "./pages/blog.page";
import SideNav from "./components/sidenavbar.component.jsx";
import ChangePassword from "./pages/change-password.page";
import EditProfile from "./pages/edit-profile.page";
import Notifications from "./pages/notifications.page";
import ManageBlogs from "./pages/manage-blogs.page";
import CategoryPage from "./pages/category.page";
import ContactUsPage from "./pages/contact-us.page";
import AboutPage from "./pages/about.page";
import PagesPage from "./pages/pages.page";
import CategoriesPage from "./pages/categories.page";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import VerifyUserPage from "./pages/verify-user.page.jsx";
import VerifyNewsletterPage from "./pages/verify-newsletter.page.jsx";
import axios from "./common/axios-config";

export const UserContext = createContext({});
export const ThemeContext = createContext({});
export const FooterContext = createContext({});
const darkThemePreference = window.matchMedia("(prefers-color-scheme: dark)").matches;

const getInitialUserAuth = () => {
  const userInSession = sessionStorage.getItem("user");
  if (userInSession) {
    try {
      return JSON.parse(userInSession);
    } catch {
      sessionStorage.removeItem("user");
      return null;
    }
  }
  return null;
};

const App = () => {
  const [userAuth, setUserAuth] = useState(getInitialUserAuth);
  const [theme, setTheme] = useState(() => darkThemePreference ? "dark" : "light");
  const [blogImages, setBlogImages] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let themeInSession = lookInSession("theme");
    
    // Initialize user authentication with token validation
    initializeUserAuth(setUserAuth);
    
    if (themeInSession) {
      setTheme(() => {
        document.body.setAttribute("data-theme", themeInSession)
        return themeInSession
      })
    }
    else {
      document.body.setAttribute("data-theme", theme);
    }
  }, [])

  useEffect(() => {
    console.log("App.jsx: userAuth value:", userAuth);
  }, [userAuth]);

  useEffect(() => {
    console.log("Server Domain:", import.meta.env.VITE_SERVER_DOMAIN);
  }, []);

  // Fetch blog images for Instagram section globally
  useEffect(() => {
    const fetchBlogImages = async () => {
      try {
        const { data } = await axios.post(
          import.meta.env.VITE_SERVER_DOMAIN + "/api/latest-blogs",
          { page: 1 }
        );
        // Get up to 12 blogs with banners and blog_id
        const blogObjs = (data.blogs || [])
          .filter(blog => blog.banner && blog.blog_id)
          .slice(0, 12);
        setBlogImages(blogObjs);
      } catch (err) {
        setBlogImages([]);
      }
    };
    fetchBlogImages();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <UserContext.Provider value={{ userAuth, setUserAuth }}>
        <FooterContext.Provider value={{ blogImages, setBlogImages, categories, setCategories }}>
          <ToastContainer position="top-right" autoClose={2000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
          <Routes>
            <Route path="/" element={<Navbar />}>
              <Route index element={<HomePage />} />
              <Route path="editor" element={<Editor />} />
              <Route path="editor/:blog_id" element={<Editor />} />
              <Route path="dashboard" element={<SideNav />}>
                <Route path="blogs" element={<ManageBlogs />} />
                <Route path="notification" element={<Notifications />} />
              </Route>
              <Route path="settings" element={<SideNav />}>
                <Route path="edit-profile" element={<EditProfile />} />
                <Route path="change-password" element={<ChangePassword />} />
              </Route>
              <Route path="login" element={<UserAuthForm type="login" />} />
              <Route path="signin" element={<UserAuthForm type="login" />} />
              <Route path="signup" element={<UserAuthForm type="signup" />} />
              <Route path="search/:query" element={<SearchPage />} />
              <Route path="user/:id" element={<ProfilePage />} />
              <Route path="blog/:blog_id" element={<BlogPage />} />
              <Route path="categories/:categoryName" element={<CategoriesPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="contact" element={<ContactUsPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="pages" element={<PagesPage />} />
              <Route path="verify-user" element={<VerifyUserPage />} />
              <Route path="verify-newsletter" element={<VerifyNewsletterPage />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        </FooterContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;