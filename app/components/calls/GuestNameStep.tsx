import { CallBrand } from "./CallBrand";

type GuestNameStepProps = {
    displayName: string;
    error: string | null;
    joining: boolean;
    onDisplayNameChange: (
        value: string,
    ) => void;
    onContinue: () => void;
};

export function GuestNameStep({
    displayName,
    error,
    joining,
    onDisplayNameChange,
    onContinue,
}: GuestNameStepProps) {
    return (
        <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
                <section className="w-full">
                    <div className="mb-10">
                        <CallBrand />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl sm:p-9">
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-400">
                                You&apos;ve been invited
                            </p>

                            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                Join a Miyor call
                            </h1>

                            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">
                                Enter your name to continue.
                                You don&apos;t need a Miyor
                                account to join.
                            </p>
                        </div>

                        <div className="mt-8">
                            <label
                                htmlFor="display-name"
                                className="text-sm font-medium text-slate-200"
                            >
                                Your name
                            </label>

                            <input
                                id="display-name"
                                type="text"
                                value={displayName}
                                onChange={(event) =>
                                    onDisplayNameChange(
                                        event.target.value,
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key ===
                                            "Enter" &&
                                        displayName.trim()
                                    ) {
                                        onContinue();
                                    }
                                }}
                                placeholder="Enter your name"
                                maxLength={100}
                                autoComplete="name"
                                autoFocus
                                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:bg-white/10"
                            />

                            {error && (
                                <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-200">
                                    {error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={onContinue}
                                disabled={
                                    !displayName.trim() ||
                                    joining
                                }
                                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {joining
                                    ? "Joining..."
                                    : "Continue"}
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        Miyor · Be thee, Anywhere.
                    </p>
                </section>
            </div>
        </main>
    );
}