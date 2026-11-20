import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/app/components/public/policy-page";

export const metadata: Metadata = {
    title: "Privacy policy | Miyor",
    description:
        "A plain-language overview of the information Miyor uses to provide conversations, calls, and device notifications.",
};

export default function PrivacyPage() {
    return (
        <PolicyPage
            eyebrow="Privacy"
            title="Privacy policy"
            intro="A plain-language overview of the information MIYOR uses to provide conversations, calls, and device notifications."
        >
            <PolicySection title="Information you provide">
                <p>
                    MIYOR processes account details such as your name,
                    username, email address, and profile image. Messages are
                    stored so conversations can be delivered and synchronized
                    across your signed-in devices.
                </p>
            </PolicySection>

            <PolicySection title="Calls and technical data">
                <p>
                    Call records and participant events are used to connect
                    participants and show call history. Connection and
                    diagnostic information may be processed to operate the
                    service and troubleshoot call quality.
                </p>
            </PolicySection>

            <PolicySection title="Face effects">
                <p>
                    The current in-call photo effect processes the selected
                    reference image and camera frames in your browser. The
                    reference image is used to render your local outgoing
                    video; it is not sent to the messaging API by this effect.
                    The resulting video is transmitted to call participants
                    through the call’s media connection.
                </p>
            </PolicySection>

            <PolicySection title="Push notifications">
                <p>
                    If you enable call alerts, MIYOR stores a browser push
                    subscription for that device and uses it to deliver
                    incoming-call notifications. You can turn alerts off in
                    Settings or in your device’s notification settings.
                </p>
            </PolicySection>

            <PolicySection title="Storage and choices">
                <p>
                    Conversation and account records remain available to
                    provide the service. You can update profile information in
                    Settings and revoke a device’s push subscription there.
                    Account deletion and data-request processes should be
                    documented here before public launch.
                </p>
            </PolicySection>

            <PolicySection title="Service providers and contact">
                <p>
                    MIYOR uses its application and database infrastructure to
                    process account, conversation, and call records. Before
                    public launch, identify hosting and email providers,
                    retention periods, the responsible legal entity, and a
                    verified privacy contact.
                </p>
            </PolicySection>
        </PolicyPage>
    );
}