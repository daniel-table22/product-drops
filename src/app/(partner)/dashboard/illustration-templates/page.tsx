import { PageHeader } from "@/components/page-header";
import { SectionIntro } from "@/components/section-intro";

const templates = [
  {
    key: "dashboard",
    illustration: "/illustrations/dashboard-intro.png",
    title: "Your drop business at a glance",
    description: "Track sales, orders, and subscribers all in one place.",
  },
  {
    key: "drops",
    illustration: "/illustrations/drops-intro.png",
    title: "Schedule drops, sell out fast",
    description:
      "Create time-limited drops with your menu, set an order window, and let customers buy before pickup day.",
  },
  {
    key: "marketing",
    illustration: "/illustrations/marketing-intro.png",
    title: "Reach your audience",
    description: "Send targeted SMS campaigns to your subscribers before each drop.",
  },
  {
    key: "storefront",
    illustration: "/illustrations/storefront-intro.png",
    title: "Your public storefront",
    description: "Customers browse your products and place orders through your storefront link.",
  },
  {
    key: "items",
    illustration: "/illustrations/items-intro.png",
    title: "Build your product catalog",
    description: "Add the items you sell, set prices, and manage inventory across drops.",
  },
];

export default function IllustrationTemplatesPage() {
  return (
    <div className="px-8 py-10 space-y-10">
      <PageHeader title="Illustration templates" size="large" />
      <p className="text-size-2 text-neutral-10 -mt-4">
        Preview of all section intro cards. These appear once per section for first-time users. Dismissing here has no effect.
      </p>

      <div className="flex flex-col gap-6">
        {templates.map((t) => (
          <div key={t.key} className="space-y-2">
            <p className="text-size-1 font-medium text-neutral-10 uppercase tracking-wide">{t.key}</p>
            <SectionIntro
              storageKey={`intro_dismissed_${t.key}`}
              illustration={t.illustration}
              title={t.title}
              description={t.description}
              buttonLabel="Show me"
              forceShow
            >
              <div />
            </SectionIntro>
          </div>
        ))}
      </div>
    </div>
  );
}
