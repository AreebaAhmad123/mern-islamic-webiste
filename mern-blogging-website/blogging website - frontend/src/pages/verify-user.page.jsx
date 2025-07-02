import { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { UserContext } from "../App";
import { updateUserAuth } from "../common/auth";

const VerifyUserPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserAuth } = useContext(UserContext);
  const [status, setStatus] = useState("Verifying your email...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("");
      setError("Invalid verification link.");
      return;
    }
    axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/verify-user?token=${token}`)
      .then(async ({ data }) => {
        setStatus("Email verified! Logging you in...");
        // Try to log in the user automatically
        // You need to know the email and password, but since you don't, prompt user to log in
        // Instead, redirect to login with a message
        toast.success("Email verified! Please log in.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      })
      .catch((error) => {
        setStatus("");
        setError(error?.response?.data?.error || "Verification failed.");
      });
  }, [searchParams, navigate, setUserAuth]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Email Verification</h2>
        {status && <p className="text-green-700 mb-2">{status}</p>}
        {error && <p className="text-red-600 mb-2">{error}</p>}
      </div>
    </div>
  );
};

export default VerifyUserPage; 