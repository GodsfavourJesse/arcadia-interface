import { CallBrand } from "./CallBrand";

type MediaPermissionStepProps = {
    displayName: string;
    loading: boolean;
    error: string | null;
    onAllow: () => void;
};

export function MediaPermissionStep({
    displayName,
    loading,
    error,
    onAllow,
}: MediaPermissionStepProps) {
    return (
        <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
                <section className="w-full">
                    <div className="mb-10">
                        <CallBrand />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl sm:p-9">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                            🎥
                        </div>

                        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Camera and microphone
                        </h1>

                        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                            Miyor needs access to your camera
                            and microphone so you can be seen
                            and heard during the call.
                        </p>

                        {error && (
                            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-left text-sm leading-5 text-amber-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onAllow}
                            disabled={loading}
                            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {loading
                                ? "Starting camera..."
                                : "Allow camera & microphone"}
                        </button>

                        <p className="mt-4 text-xs leading-5 text-slate-500">
                            Your browser will ask for permission.
                        </p>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        Joining as{" "}
                        <span className="font-medium text-slate-300">
                            {displayName}
                        </span>
                    </p>
                </section>
            </div>
        </main>
    );
}