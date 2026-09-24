type InvitationErrorProps = {
    message: string;
};

export function InvitationError({
    message,
}: InvitationErrorProps) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    !
                </div>

                <h1 className="mt-6 text-2xl font-semibold text-slate-950">
                    Invitation unavailable
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    {message}
                </p>
            </section>
        </main>
    );
}