import InputBox from "../components/input.component";
import { useRef, useContext, useState } from "react";
import googleIcon from "../imgs/google.png";
import { Link, Navigate } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";
import { updateUserAuth } from "../common/auth";

const UserAuthForm = ({ type }) => {
  let { userAuth, setUserAuth } = useContext(UserContext);
  const access_token = userAuth?.access_token;

  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  console.log("Current access_token:", access_token);

  const userAuththroughServer = (serverRoute, formData) => {
    console.log("Sending request to:", import.meta.env.VITE_SERVER_DOMAIN + "/api" + serverRoute);
    console.log("Form data:", formData);
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api" + serverRoute, formData)
      .then(({ data }) => {
        if (serverRoute === "/signup") {
          setInfoMsg("Signup successful! Please check your email to verify your account.");
          setShowResend(true);
          setResendEmail(formData.email);
        } else if (serverRoute === "/login" || serverRoute === "/google-auth") {
          updateUserAuth(data, setUserAuth);
        }
        console.log("Stored in sessionStorage:", sessionStorage.getItem("user"));
      })
      .catch((error) => {
        // Improved error handling for better debugging
        let errorMsg = "Login failed. Please try again.";
        if (error?.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error?.message) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        }
        // If login failed due to unverified email, show resend option
        if (errorMsg.includes("verify your email") || errorMsg.includes("Failed to send verification email")) {
          setShowResend(true);
          setResendEmail(formData.email);
        }
        // Show a more helpful message if email is not found
        if (errorMsg === "Email not found") {
          toast.error("No account found with this email. Please sign up first.");
        } else {
          toast.error(errorMsg);
        }
        // Log the full error object for debugging
        console.error("Full error object:", error);
        if (error?.response) {
          console.error("Error response data:", error.response.data);
        }
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let serverRoute = type === "login" ? "/login" : "/signup";
    let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

    let formElement = document.getElementById("formElement");
    if (!formElement) {
      console.error("Form element is not found");
      return;
    }
    let form = new FormData(formElement);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }
    let { firstname, lastname, email, password } = formData;

    if (type !== "login") {
      if (!firstname || firstname.length < 1) {
        return toast.error("First name must be at least 1 letter long");
      }
      if (!lastname || lastname.length < 1) {
        return toast.error("Last name must be at least 1 letter long");
      }
      if ((firstname + ' ' + lastname).trim().length < 3) {
        return toast.error("Fullname must be at least 3 letters long");
      }
    }
    if (!email.length) {
      return toast.error("Enter Email");
    }
    if (!emailRegex.test(email)) {
      return toast.error("Email is invalid");
    }
    if (!passwordRegex.test(password)) {
      return toast.error("Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letter");
    }
    userAuththroughServer(serverRoute, formData);
  };

  const handleGoogleAuth = (e) => {
    e.preventDefault();

    authWithGoogle()
    .then(({ idToken }) => {
        let serverRoute = "/google-auth";
        let formData = {
            id_token: idToken
        }
        userAuththroughServer(serverRoute, formData)
    })
    .catch(err => {
        toast.error("trouble login through google");
        return console.log(err)
    })

  }

  const handleResendVerification = (e) => {
    e.preventDefault();
    if (!resendEmail) {
      toast.error("Enter your email to resend verification.");
      return;
    }
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/resend-verification", { email: resendEmail })
      .then(({ data }) => {
        toast.success(data.message || "Verification email resent. Please check your inbox.");
      })
      .catch((error) => {
        const errorMsg = error?.response?.data?.error || "Failed to resend verification email.";
        toast.error(errorMsg);
      });
  };

  return (
    access_token ? <Navigate to="/" /> :
      <AnimationWrapper keyValue={type}>
        <section className="h-cover flex items-center justify-center px-2 sm:px-0">
          <Toaster />
          <form id="formElement" className="w-full max-w-[400px] bg-white rounded-lg shadow-md p-4 sm:p-8 flex flex-col" onSubmit={handleSubmit}>
            <h1 className="text-2xl sm:text-4xl font-gelasio capitalize text-center mb-10 sm:mb-24 w-full">
              {type === "login" ? "Welcome back" : "Join us today"}
            </h1>
            {infoMsg && (
              <div className="mb-4 text-green-700 text-center text-sm sm:text-base w-full">{infoMsg}</div>
            )}
            <div className="w-full flex flex-col items-center">
            {type !== "login" ? (
              <>
                <InputBox name="firstname" type="text" placeholder="First Name" icon="fi-rr-user" />
                <InputBox name="lastname" type="text" placeholder="Last Name" icon="fi-rr-user" />
              </>
            ) : ""}
            <InputBox name="email" type="email" placeholder="Email" icon="fi-rr-envelope" autoComplete="username" onChange={e => setResendEmail(e.target.value)} />
            <InputBox name="password" type="password" placeholder="Password" icon="fi-rr-key" />
            </div>
            <button className="btn-dark w-full mt-8 sm:mt-14 text-base sm:text-sm py-3 sm:py-3" type="submit">
              {type === "signup" ? "Sign Up" : "Login"}
            </button>
            {showResend && (
              <button className="btn-dark w-full mt-4" onClick={handleResendVerification} type="button">
                Resend verification email
              </button>
            )}
            <div className="relative w-full flex items-center gap-2 my-6 sm:my-10 opacity-10 uppercase text-black font-bold text-xs sm:text-base">
              <hr className="w-1/2 border-black" />
              <p>or</p>
              <hr className="w-1/2 border-black " />
            </div>
            <button className="btn-dark flex items-center justify-center gap-4 w-full text-base sm:text-sm py-3 sm:py-3" onClick={handleGoogleAuth}>
              <img src={googleIcon} className="w-5" />
              Continue with google
            </button>
            {type === "login" ? (
              <p className="mt-6 text-dark-grey text-base sm:text-xl text-center w-full">
                Don't have an account?
                <Link to="/signup" className="underline text-black text-base sm:text-xl ml-1">
                  Join us today
                </Link>
              </p>
            ) : (
              <p className="mt-6 text-dark-grey text-base sm:text-xl text-center w-full">
                Already a member?
                <Link to="/login" className="underline text-black text-base sm:text-xl ml-1">
                  Sign in here.
                </Link>
              </p>
            )}
          </form>
        </section>
      </AnimationWrapper>
  );
};

export default UserAuthForm;