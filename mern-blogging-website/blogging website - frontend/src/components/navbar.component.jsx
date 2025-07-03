import { useState, useEffect, useRef, useContext } from "react";
import { Link, Outlet } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { UserContext, FooterContext } from '../App';
import UserNavigationPanel from "../components/user-navigation.component"
import axios from "../common/axios-config";
import { ThemeContext } from "../App";
import Footer from "./footer.component.jsx";
import { updateUserAuth } from "../common/auth";

const Navbar = () => {
  const [userNavPanel, setUserNavPanel] = useState(false);
  const { userAuth, setUserAuth } = useContext(UserContext);
  const { blogImages, categories } = useContext(FooterContext);
  let {theme, setTheme} = useContext(ThemeContext);
  const access_token = userAuth?.access_token;
  const profile_img = userAuth?.personal_info?.profile_img || userAuth?.profile_img;
  const new_notification_available = userAuth?.new_notification_available;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const [searchBoxVisibility, setSearchBoxVisibility] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const inputRef = useRef(null);

  // Footer state
  const [recentComments, setRecentComments] = useState([]);

  const location = useLocation();
  let navigate = useNavigate();

  const hideSearchRoutes = ["/login", "/signup"];
  const shouldShowSearch = !hideSearchRoutes.includes(location.pathname);
  const handleUserNavPanel = () => {
    setUserNavPanel(currentVal => !currentVal);
  };
  const handleBlur = () => {
    setTimeout(() => {
      setUserNavPanel(false)

    }, 200);
  }
  const handleSearch = (e) => {
    let query = e.target.value.trim();

    if (e.keyCode === 13 && query.length) {
      navigate(`/search/${query}`);
    }
  };

  useEffect(() => {
    if (access_token) {
      const checkNotifications = () => {
        axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/api/new-notification`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
          .then(({ data }) => {
            const updatedUserAuth = { ...userAuth, ...data };
            updateUserAuth(updatedUserAuth, setUserAuth);
          })
          .catch(err => {
            console.error('Error checking notifications:', err);
            if (err.code === 'ERR_NETWORK' || err.message.includes('ECONNREFUSED')) {
              console.error('Server connection failed. Make sure the server is running on port 3000.');
            }
          });
      };

      // Check immediately
      checkNotifications();

      // Set up interval to check every 30 seconds
      const interval = setInterval(checkNotifications, 30000);

      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }
  }, [access_token]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchBoxVisibility(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchBoxVisibility && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchBoxVisibility]);

  useEffect(() => {
    setSearchBoxVisibility(false);
  }, [location.pathname]);

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.body.setAttribute("data-theme", newTheme);
    sessionStorage.setItem("theme", newTheme);
  };

  const handleNotificationClick = () => {
    // Immediately mark notifications as seen when clicking the icon
    if (new_notification_available && access_token) {
      const updatedUserAuth = { ...userAuth, new_notification_available: false };
      updateUserAuth(updatedUserAuth, setUserAuth);
      axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/seen-notifications", {}, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }).catch(err => {
        console.log('Error marking notifications as seen:', err);
      });
    }
  };

  // Fetch recent comments for footer
  useEffect(() => {
    const fetchRecentComments = async () => {
      try {
        const { data } = await axios.get(
          import.meta.env.VITE_SERVER_DOMAIN + "/api/recent-comments"
        );
        setRecentComments(data.comments || []);
      } catch (err) {
        console.error("Error fetching recent comments:", err);
        setRecentComments([]);
      }
    };
    fetchRecentComments();
  }, []);

  return (
    <>
      <nav className="navbar flex items-center justify-between z-50 mb-2">
        <Link to="/" className="text-2xl font-bold text-[#185d4e] shrink-0 logo-text">
          IslamicStories
        </Link>

        {/* Navigation links */}
        <div className="hidden md:flex space-x-6 mr-auto ml-8 items-center flex-nowrap">
          <Link to="/" className="text-gray-600 navHover">
            Home
          </Link>
          
          <div className="relative"
            onMouseEnter={() => setShowCategoryDropdown(true)}
            onMouseLeave={() => setShowCategoryDropdown(false)}
          >
           
            <Link to="/categories" className="text-gray-600 navHover flex items-center focus:outline-none" onClick={() => setShowCategoryDropdown(false)}>
              Categories
              <i className="fi fi-rr-angle-small-down ml-2 navHover pt-1"></i>
            </Link>
            {showCategoryDropdown && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded shadow-lg z-50">
                {categories.map((cat, idx) => (
                  <Link
                    key={cat}
                    to={`/categories/${encodeURIComponent(cat)}`}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 capitalize"
                    onClick={() => setShowCategoryDropdown(false)}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}
          </div>
         
          <Link to="/contact" className="text-gray-600 navHover">
            Contact
          </Link>
          <Link to="/about" className="text-gray-600 navHover">
            About 
          </Link>

        </div>

        {/* Desktop Auth/Profile */}
        <div className="flex items-center gap-5 shrink-0">
          <button
              className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10 dark-hover flex items-center justify-center hidden md:flex"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <i className="fi fi-rr-sun text-xl "></i>
              ) : (
                <i className="fi fi-rr-moon-stars text-xl"></i>
              )}
            </button>
          {access_token ? (
            <>
              {userAuth?.isAdmin ? (
                <Link className="border-2 border-grey rounded-full px-5 py-0 hidden md:block" to="/editor">
                  <i className="fi fi-rr-file-edit text-sm pt-2 -ml-2"></i> Write
                </Link>
              ) : null}
              <Link to="/dashboard/notification" className="hidden md:block">
                <button 
                  className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10 dark-hover"
                  onClick={handleNotificationClick}
                >
                  <i className="fi fi-rr-bell text-2xl block mt-1"></i>
                  {new_notification_available ? (
                    <span className="bg-red w-3 h-3 rounded-full absolute z-10 top-2 right-2"></span>
                  ) : ""}
                </button>
              </Link>


              <div className="relative hidden md:block">
                <button className="w-12 h-12 " onClick={handleUserNavPanel} onBlur={handleBlur}>
                  <img
                    src={profile_img || "/default-profile.png"}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
                {userNavPanel && <UserNavigationPanel />}

              </div>
            </>
          ) : (
            <>
              <Link className="btn-light py-2 hidden md:block" to="/login">
                Login
              </Link>
              <Link className="btn-dark py-2 hidden md:block" to="/signup">
                SignUp
              </Link>
            </>
          )}
        </div>

        {/* Mobile Header Icons */}
        <div ref={menuRef} className="flex items-center gap-2 md:gap-6 ">
          {/* Search Button */}
          <button
            className="md:hidden bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center"
            onClick={() => setSearchBoxVisibility(currentVal => !currentVal)}
          >
            <i className="fi fi-rr-search text-xl"></i>
          </button>
          <button
              className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10 dark-hover flex items-center justify-center md:hidden"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <i className="fi fi-rr-sun text-xl "></i>
              ) : (
                <i className="fi fi-rr-moon-stars text-xl"></i>
              )}
            </button>
          {access_token && userAuth?.isAdmin ? (
            <Link to="/editor" className="md:hidden">
              <i className="fi fi-rr-file-edit "></i>
            </Link>
          ) : null}
          {/* Notification & Profile (Mobile) */}
          {access_token && (
            <>
              <Link to="/dashboard/notification" className="md:hidden">
                <button 
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center relative"
                  onClick={handleNotificationClick}
                >
                  <i className="fi fi-rr-bell text-xl"></i>
                  {new_notification_available ? (
                    <span className="bg-red w-3 h-3 rounded-full absolute z-10 top-2 right-2"></span>
                  ) : (
                    ""
                  )}
                </button>
              </Link>
              <div className="relative md:hidden" onClick={handleUserNavPanel} onBlur={handleBlur}>
                <button className="w-6 h-6">
                  <img
                    src={profile_img || "/default-profile.png"}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
                {
                  userNavPanel ? <UserNavigationPanel />
                    : ""
                }
              </div>
            </>
          )}
          {/* Menu Button */}
          <button
            className="md:hidden "
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <i className="fi fi-br-menu-burger text-xl "></i>
          </button>
        </div>

        {/* Search input — mobile */}
        <div
          ref={searchRef}
          className={
            "absolute bg-white mt-0.5 left-0 w-full border-b border-grey py-4 px-[5vw] md:block md:border-0 md:relative md:inset-0 md:p-0 md:w-auto md:show " +
            (searchBoxVisibility ? "block" : "hidden") +
            " md:hidden lg:hidden "
          }
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search"
              className="w-full md:w-auto bg-grey p-4 pl-6 pr-[12%] md:pr-6 rounded-full placeholder:text-dark-grey md:pl-12 md:hidden lg:hidden sm:text-sm "
              onKeyDown={handleSearch}
            />
            <i className="fi fi-rr-search absolute right-[10%] top-1/2 -translate-y-1/2 text-2xl text-gray-500"></i>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <>
            {/* Overlay for mobile menu */}
            <div
              className="fixed inset-0 bg-black bg-opacity-30 z-[9998] md:hidden"
              onClick={() => setIsMenuOpen(false)}
            ></div>
            {/* Menu itself */}
            <div className="fixed md:hidden top-16 left-0 right-0 bg-white py-4 px-4 shadow-lg z-[9999] border-4 border-red-500" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col space-y-4">
                <Link to="/" className="text-gray-600 navHover" onClick={() => setIsMenuOpen(false)}>
                  Home
                </Link>
                {/* Categories: link and dropdown for mobile */}
                <div className="flex items-center">
                  <Link
                    to="/categories"
                    className="text-gray-600 navHover flex-1"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    Categories
                  </Link>
                  <button
                    className="text-gray-600 navHover flex items-center text-left ml-2"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    aria-label="Show categories dropdown"
                  >
                    <i className="fi fi-rr-angle-small-down navHover pt-1"></i>
                  </button>
                </div>
                {showCategoryDropdown && (
                  <div className="ml-4 mt-1 bg-white rounded shadow-lg z-50">
                    {categories.map((cat, idx) => (
                      <Link
                        key={cat}
                        to={`/categories/${encodeURIComponent(cat)}`}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 capitalize"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                )}
                <Link to="/contact" className="text-gray-600 navHover" onClick={() => setIsMenuOpen(false)}>
                  Contact
                </Link>
                <Link to="/about" className="text-gray-600 navHover" onClick={() => setIsMenuOpen(false)}>
                  About
                </Link>
                {access_token ? (
                  <>
                    {userAuth?.isAdmin && (
                      <Link to="/editor" className="text-gray-600 navHover" onClick={() => setIsMenuOpen(false)}>
                        <i className="fi fi-rr-file-edit text-sm pt-2 -ml-2"></i> Write
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/login" className="text-gray-600 navHover" onClick={() => setIsMenuOpen(false)}>
                      Login
                    </Link>
                    <Link to="/signup" className="text-gray-600 navHover" onClick={() => setIsMenuOpen(false)}>
                      SignUp
                    </Link>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </nav>
      {/* Desktop Search */}
      {shouldShowSearch && (
        <div className="search hidden lg:block md:block py-2">
          <input
            type="text"
            placeholder="Search"
            className="md:w-[400px] lg:w-[700px] sm:w-[400px] px-4 py-2 mr-auto border border-grey-100 rounded-md text-black"
            onKeyDown={handleSearch}
          />
          <i className="fi fi-rr-search text-1xl bg-black text-white p-3 rounded-md ml-2"></i>
        </div>
      )}
      <Outlet />
      {/* Hide Footer on login and signup pages */}
      {!(location.pathname === "/login" || location.pathname === "/signup") && (
        <Footer
          instagramImages={blogImages}
          recentComments={recentComments}
          categories={categories}
        />
      )}
    </>
  );
};

export default Navbar;