import PageMeta from "../../components/common/PageMeta";
import SignInForm from "../../components/auth/SignInForm";
import { env } from "../../config/env";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title={`Masuk | ${env.appName}`}
        description="Masuk ke MyHR untuk mengelola data karyawan, absensi, dan proses persetujuan HR."
      />
      <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb]">
        <style>{`
          @keyframes login-fade-up {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes login-grid-drift {
            from { transform: translateY(0); }
            to { transform: translateY(-24px); }
          }
          @keyframes login-scan {
            0% { transform: translateY(-30%); opacity: 0; }
            15% { opacity: 0.55; }
            85% { opacity: 0.55; }
            100% { transform: translateY(130%); opacity: 0; }
          }
          @keyframes login-holo-pulse {
            0%, 100% { opacity: 0.34; filter: saturate(0.35) brightness(1.05) contrast(1.08); }
            50% { opacity: 0.48; filter: saturate(0.5) brightness(1.18) contrast(1.12); }
          }
          .login-fade-up { animation: login-fade-up 0.7s ease-out both; }
          .login-fade-up-delay-1 { animation: login-fade-up 0.75s ease-out 0.12s both; }
          .login-fade-up-delay-2 { animation: login-fade-up 0.8s ease-out 0.28s both; }
          .login-grid-drift { animation: login-grid-drift 18s linear infinite alternate; }
          .login-scan { animation: login-scan 7s ease-in-out infinite; }
          .login-holo-image { animation: login-holo-pulse 6s ease-in-out infinite; }
        `}</style>

        <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
          <aside className="relative hidden overflow-hidden bg-[#07121f] lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0">
              <img
                src="/images/icon_background_login.jpg"
                alt=""
                aria-hidden="true"
                className="login-holo-image absolute inset-0 h-full w-full scale-110 object-cover object-[center_40%]"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(7,18,31,0.78) 0%, rgba(7,18,31,0.45) 38%, rgba(7,18,31,0.55) 68%, rgba(7,18,31,0.92) 100%), linear-gradient(90deg, rgba(7,18,31,0.75) 0%, rgba(7,18,31,0.2) 55%, rgba(7,18,31,0.65) 100%), radial-gradient(circle at 55% 45%, rgba(56,189,248,0.22), transparent 55%)",
                }}
              />
              <div
                className="absolute inset-0 mix-blend-screen opacity-40"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(56,189,248,0.25), transparent 45%, rgba(70,95,255,0.18))",
                }}
              />
              <div
                className="login-grid-drift absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(125,211,252,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.45) 1px, transparent 1px)",
                  backgroundSize: "42px 42px",
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(186,230,253,0.18) 0px, rgba(186,230,253,0.18) 1px, transparent 1px, transparent 3px)",
                }}
              />
              <div className="login-scan absolute inset-x-0 h-36 bg-gradient-to-b from-transparent via-sky-300/25 to-transparent" />
            </div>

            <div className="relative z-10 flex items-start justify-between gap-6 px-10 pt-10 xl:px-14">
              <img
                src="/images/logo/myhr-logo-tagline-dark.png"
                alt="MyHR - People, Process, Better Future"
                className="h-20 w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
              />
              <div className="login-fade-up-delay-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.65)] backdrop-blur-sm">
                <img
                  src="/images/alamtri_logo.png"
                  alt="AlamTri geo"
                  className="h-10 w-auto object-contain xl:h-11"
                />
              </div>
            </div>

            <div className="relative z-10 flex flex-1 items-center px-10 py-12 xl:px-14">
              <div className="login-fade-up max-w-lg">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">
                  Portal HR Alamtri Geo
                </p>
                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] xl:text-5xl">
                  Satu aplikasi untuk
                  <span className="block text-sky-300">kelola operasional HR.</span>
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-slate-200/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                  Masuk untuk mengakses data karyawan, absensi, rekonsiliasi, dan
                  alur persetujuan dalam workspace MyHR yang aman.
                </p>
                <ul className="mt-7 space-y-2.5 text-sm text-slate-300/95">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>Data organisasi dan karyawan dalam satu tempat</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>Rekonsiliasi absensi, sakit, dan izin lebih terstruktur</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>Akses sesuai peran dan hak pengguna</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="relative z-10 border-t border-white/10 bg-black/25 px-10 py-5 backdrop-blur-sm xl:px-14">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Sistem internal AlamTri Geo
              </p>
              <p className="mt-1 text-sm text-slate-200">
                Akses terbatas untuk karyawan dan administrator yang berwenang.
              </p>
            </div>
          </aside>

          <main className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div
              className="pointer-events-none absolute inset-0 lg:hidden"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top, rgba(70,95,255,0.12), transparent 45%), linear-gradient(180deg, #e8eef8 0%, #f4f7fb 40%)",
              }}
            />

            <div className="login-fade-up-delay-2 relative w-full max-w-[420px]">
              <div className="mb-7 flex flex-col gap-4 lg:hidden">
                <img
                  src="/images/logo/myhr-logo-tagline.png"
                  alt="MyHR - People, Process, Better Future"
                  className="h-16 w-auto self-start object-contain"
                />
                <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-gray-200 bg-[#0a1624] px-3 py-2 shadow-sm">
                  <img
                    src="/images/alamtri_logo.png"
                    alt="AlamTri geo"
                    className="h-8 w-auto object-contain"
                  />
                  <span className="pr-1 text-[11px] font-medium tracking-wide text-slate-300">
                    AlamTri Geo
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200/80 bg-white/90 p-7 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-9 dark:border-gray-800 dark:bg-gray-900/90">
                <SignInForm />
              </div>

              <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
                {env.appName} milik AlamTri Geo.
                <br className="sm:hidden" />{" "}
                Hanya untuk karyawan dan admin yang berwenang.
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
