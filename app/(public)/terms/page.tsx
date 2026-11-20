import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/app/components/public/policy-page";

export const metadata: Metadata = {
    title: "Terms of use | Miyor",
    description:
        "The expectations for using Miyor’s messaging, meetings, guest links, and camera effects.",
};

export default function TermsPage() {
    return (
        <PolicyPage
            eyebrow="Terms"
            title="Terms of use"
            intro="These terms explain the expectations for using Miyor’s messaging, meetings, guest links, and camera effects."
        >
            <PolicySection title="Using Miyor">
                <p>
                    Use Miyor lawfully and respectfully. Keep your account
                    credentials private, provide accurate account information,
                    and only access conversations and meetings you are invited
                    or authorized to join.
                </p>
            </PolicySection>

            <PolicySection title="Calls and guest access">
                <p>
                    Meeting hosts are responsible for managing invitations and
                    participant permissions. Guests may be asked to provide a
                    display name. Do not share a meeting link publicly when the
                    meeting is intended to be private.
                </p>
            </PolicySection>

            <PolicySection title="Camera effects and images">
                <p>
                    Only use images you have the right to use. Obtain
                    permission from people whose likeness you use, and do not
                    use effects to deceive, harass, defame, or create harmful
                    or misleading content. Clearly explain playful
                    transformations to people on the call.
                </p>
            </PolicySection>

            <PolicySection title="Your content">
                <p>
                    You retain rights to content you create. You authorize
                    Miyor to process and transmit the content needed to provide
                    messaging, calls, and effects. Do not upload or send
                    content that violates another person’s rights or the law.
                </p>
            </PolicySection>

            <PolicySection title="Availability and changes">
                <p>
                    Miyor is evolving. Features, availability, and limits may
                    change as the service develops. We may restrict access when
                    necessary to protect users, service reliability, or legal
                    obligations.
                </p>
            </PolicySection>

            <PolicySection title="Questions">
                <p>
                    Before public launch, add the operating entity, governing
                    law, a support contact, and any required
                    jurisdiction-specific terms to this page.
                </p>
            </PolicySection>
        </PolicyPage>
    );
}