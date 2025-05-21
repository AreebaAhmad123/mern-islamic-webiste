import { useState, useEffect, useRef, useContext } from "react";
import { Link, Outlet } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from '../App';
import UserNavigationPanel from "../components/user-navigation.component"

const Navbar = () => {
  const [userNavPanel, setUserNavPanel] = useState(false);
  const { userAuth } = useContext(userContext);
  const access_token = userAuth?.access_token;
  const profile_img = userAuth?.profile_img;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const [searchBoxVisibility, setSearchBoxVisibility] = useState(false);

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
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav className="navbar flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-[#185d4e] shrink-0">
          IslamicStories
        </Link>

        {/* Navigation links */}
        <div className="hidden md:flex space-x-6 mr-auto ml-8 items-center flex-nowrap">
          <Link to="/categories" className="text-gray-600 navHover flex items-center">
            Categories
            <i className="fi fi-rr-angle-small-down ml-2 navHover pt-1"></i>
          </Link>
          <Link to="/pages" className="text-gray-600 navHover flex items-center">
            Pages
            <i className="fi fi-rr-angle-small-down ml-2 navHover pt-1"></i>
          </Link>
          <Link to="/contact" className="text-gray-600 navHover">
            Contact
          </Link>
          <Link to="/about" className="text-gray-600 navHover">
            About
          </Link>

        </div>

        {/* Desktop Auth/Profile */}
        <div className="flex items-center gap-5 shrink-0">
          {access_token ? (
            <>
              <Link className="border-2 border-grey rounded-full px-5 py-0 hidden md:block" to="/editor">
                <i className="fi fi-rr-file-edit text-sm pt-2 -ml-2"></i> Write
              </Link>
              <Link to="/dashboard/notification" className="hidden md:block">
                <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10">
                  <i className="fi fi-rr-bell text-2xl block mt-1"></i>
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
              <Link className="border-2 border-grey rounded-full px-5 py-0 hidden md:block" to="/editor">
                <i className="fi fi-rr-file-edit text-sm pt-2 -ml-2"></i> Write
              </Link>
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
        <div ref={menuRef} className="flex items-center gap-4 md:gap-6 ">          {/* Search Button */}
          <button
            className="md:hidden bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center"
            onClick={() => setSearchBoxVisibility(currentVal => !currentVal)}
          >
            <div className="relative flex items-center">
              
              <i className="fi fi-rr-search text-xl absolute left-3 text-gray-500"></i>
            </div>



          </button>
          <Link to="/editor">
            <i className="fi fi-rr-file-edit "></i>
          </Link>

          {/* Notification & Profile (Mobile) */}
          {access_token && (
            <>
              <Link to="/dashboard/notification" className="md:hidden">
                <button className=" rounded-full  relative">
                  <i className="fi fi-rr-bell text-xl block rounded-full -mt-0.5 hover:bg-black"></i>
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
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white py-4 px-4 shadow-lg z-50">
            <div className="flex flex-col space-y-4">
              <Link to="/categories" className="text-gray-600 navHover">
                Categories
              </Link>
              <Link to="/pages" className="text-gray-600 navHover">
                Pages
              </Link>
              <Link to="/contact" className="text-gray-600 navHover">
                Contact Us
              </Link>
              <Link to="/about" className="text-gray-600 navHover">
                About Us
              </Link>
            </div>
          </div>
        )}
      </nav >

      {/* Desktop Search */}
      {
        shouldShowSearch && (
          <div className="search hidden lg:block md:block">
            <input
              type="text"
              placeholder="Search"
              className="md:w-[400px] lg:w-[700px] sm:w-[400px] px-4 py-2 mr-auto border border-grey-100 rounded-md text-black"
              onKeyDown={handleSearch}
            />
            <i className="fi fi-rr-search text-1xl bg-black text-white p-3 rounded-md ml-2"></i>
          </div>
        )
      }

      <Outlet />
    </>
  );
};

export default Navbar;