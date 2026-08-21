import React, { useState } from "react";
import { supabase } from "../components/supabaseClientforLogin";
import { useNavigate } from "react-router-dom";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login for:", email);
      console.log("Supabase client:", supabase); // Debug: Check if supabase is loaded
      
      // Test connection first
      try {
        const { data: testData, error: testError } = await supabase
          .from('fleet_managers')
          .select('count')
          .limit(1);
        
        console.log("Connection test:", testData, testError);
        
        if (testError) {
          console.error("Connection test failed:", testError);
          setError(`Cannot connect to database: ${testError.message}. Please check your Supabase configuration.`);
          setLoading(false);
          return;
        }
      } catch (connErr) {
        console.error("Connection error:", connErr);
        setError("Network error. Please check your internet connection and Supabase URL.");
        setLoading(false);
        return;
      }

      // Query the fleet_managers table
      const { data, error: queryError } = await supabase
        .from('fleet_managers')
        .select('*')
        .eq('email', email);

      console.log("Query result:", data);

      if (queryError) {
        console.error('Query error:', queryError);
        setError(`Database error: ${queryError.message}`);
        setLoading(false);
        return;
      }

      // Check if user exists
      if (!data || data.length === 0) {
        setError("No account found with this email.");
        setLoading(false);
        return;
      }

      const user = data[0];
      console.log("User found:", user);

      // Check password
      if (user.password !== password) {
        setError("Invalid password. Please try again.");
        setLoading(false);
        return;
      }

      // Login successful
      console.log("✅ Login successful for:", user.email);
      
      // ============================================
      // 🔥 TRACKING CODE
      // ============================================
      
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name || user.full_name || 'Unknown User',
        role: user.role || 'Unknown Role',
        created_at: user.created_at
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', 'authenticated');
      
      window.dispatchEvent(new Event('userLoggedIn'));
      
      console.log('✅ Login complete - tracking will start');
      console.log('👤 User data saved:', userData);
      
      if (onLogin) {
        onLogin(user);
      }
      
      navigate('/dashboard');
      setEmail("");
      setPassword("");
      
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login error: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Rest of your styles and return statement remain the same...
  const styles = {
    wrapper: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
      padding: "20px",
    },
    card: {
      background: "white",
      borderRadius: "16px",
      padding: "40px 35px",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
      width: "100%",
      maxWidth: "400px",
    },
    header: {
      textAlign: "center",
      marginBottom: "30px",
    },
    title: {
      fontSize: "28px",
      color: "#1a202c",
      marginBottom: "8px",
      fontWeight: "700",
    },
    subtitle: {
      color: "#718096",
      fontSize: "15px",
    },
    errorMessage: {
      background: "#fed7d7",
      color: "#c53030",
      padding: "12px 15px",
      borderRadius: "8px",
      marginBottom: "20px",
      fontSize: "14px",
      border: "1px solid #feb2b2",
    },
    formGroup: {
      marginBottom: "20px",
    },
    label: {
      display: "block",
      marginBottom: "8px",
      color: "#2d3748",
      fontSize: "14px",
      fontWeight: "600",
    },
    input: {
      width: "100%",
      padding: "12px 15px",
      border: "2px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "15px",
      transition: "all 0.2s",
      background: "#f7fafc",
      boxSizing: "border-box",
    },
    passwordWrapper: {
      position: "relative",
    },
    passwordInput: {
      paddingRight: "70px",
    },
    toggleButton: {
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      color: "#718096",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      padding: "5px 8px",
      borderRadius: "4px",
    },
    formOptions: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      margin: "20px 0 25px",
    },
    rememberMe: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#4a5568",
      fontSize: "14px",
      cursor: "pointer",
    },
    checkbox: {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    forgotLink: {
      color: "#667eea",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: "500",
    },
    loginButton: {
      width: "100%",
      padding: "14px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    loginButtonDisabled: {
      opacity: "0.7",
      cursor: "not-allowed",
    },
    signupLink: {
      textAlign: "center",
      marginTop: "25px",
      color: "#718096",
      fontSize: "14px",
    },
    signupAnchor: {
      color: "#667eea",
      textDecoration: "none",
      fontWeight: "600",
    },
    loadingSpinner: {
      display: "inline-block",
      width: "20px",
      height: "20px",
      border: "3px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTopColor: "#ffffff",
      animation: "spin 0.8s linear infinite",
    },
  };

  return (
    <div style={styles.wrapper}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          input:focus {
            outline: none;
            border-color: #667eea !important;
            background: white !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          }
          .toggle-btn:hover {
            background: #e2e8f0 !important;
          }
          .login-btn:hover:not(:disabled) {
            transform: translateY(-2px) !important;
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3) !important;
          }
          a:hover {
            text-decoration: underline !important;
          }
        `}
      </style>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your fleet account</p>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                ...styles.input,
                ...(loading ? styles.loginButtonDisabled : {}),
              }}
              className="input-field"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <div style={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  ...styles.input,
                  ...styles.passwordInput,
                  ...(loading ? styles.loginButtonDisabled : {}),
                }}
                className="input-field"
              />
              <button
                type="button"
                className="toggle-btn"
                style={styles.toggleButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* <div style={styles.formOptions}>
            <label style={styles.rememberMe}>
              <input type="checkbox" style={styles.checkbox} />
              Remember me
            </label>
            <a href="/forgot-password" style={styles.forgotLink}>
              Forgot password?
            </a>
          </div> */}

          <button
            type="submit"
            className="login-btn"
            style={{
              ...styles.loginButton,
              ...(loading ? styles.loginButtonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.loadingSpinner}></span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* <div style={styles.signupLink}>
          Don't have an account?{" "}
          <a href="/signup" style={styles.signupAnchor}>
            Sign up
          </a>
        </div> */}
      </div>
    </div>
  );
};

export default Login;