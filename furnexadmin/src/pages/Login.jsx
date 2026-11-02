import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Armchair } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../utils/helpers";
import { Spinner } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user?.role === "admin") return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u?.role !== "admin") throw new Error("This account does not have admin access.");
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink-900 p-12 text-white lg:flex">
        <Armchair className="h-10 w-10 text-brass-500" />
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Ashirwad Furnex</h1>
          <p className="mt-3 max-w-sm text-white/70">Manage your catalogue, banners and customer inquiries from one place.</p>
        </div>
        <p className="text-sm text-white/40">Admin access only</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold">Log in to admin panel</h2>
          <p className="mb-6 mt-1 text-sm text-stone-500">Use your admin email and password.</p>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoFocus className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} required className="input pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 p-0.5 text-stone-500" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Log in</button>
          </div>
        </form>
      </div>
    </div>
  );
}
