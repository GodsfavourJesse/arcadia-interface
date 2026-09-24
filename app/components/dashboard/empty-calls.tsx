export function EmptyCalls() {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-6 w-6 text-slate-500"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m15.5 12 4.25 2.5v-5L15.5 12Z"
                        />

                        <rect
                            x="3"
                            y="6"
                            width="12.5"
                            height="12"
                            rx="2"
                        />
                    </svg>
                </div>

                <h2 className="mt-5 text-base font-semibold text-slate-950">
                    No calls yet
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Your recent Miyor calls will appear here once
                    you start connecting with people.
                </p>

                <button
                    type="button"
                    className="mt-6 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    Create your first call
                </button>
            </div>
        </section>
    );
}