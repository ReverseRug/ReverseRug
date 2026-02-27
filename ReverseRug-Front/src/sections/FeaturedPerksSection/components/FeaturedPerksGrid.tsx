import { motion } from "framer-motion";
import { PerkCard } from "@/sections/FeaturedPerksSection/components/PerkCard";

type FeaturedPerksGridProps = {
  isInView: boolean;
};

export const FeaturedPerksGrid = ({ isInView }: FeaturedPerksGridProps) => {
  const perks = [
    {
      companyName: "Google Cloud",
      programName: "Google for Startups Cloud Program",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "Up to $350,000",
      valueVariant: "bg-blue-500 dark:bg-blue-600",
      description: "Cloud credits over two years with additional perks for AI-focused startups. Includes access to Firebase, technical support, and Google Cloud training.",
      category: "Cloud Infrastructure",
      categoryVariant: "bg-blue-500 dark:bg-blue-600",
      detailsUrl: "#",
      applyUrl: "https://cloud.google.com/startup",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Cloudflare",
      programName: "Cloudflare for Startups",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "Up to $250,000",
      valueVariant: "bg-blue-500 dark:bg-blue-600",
      description: "Credits for Cloudflare's Developer Platform including Workers, Pages, R2 storage, D1 database, and enterprise-level security features for up to 3 domains.",
      category: "Cloud Infrastructure",
      categoryVariant: "bg-blue-500 dark:bg-blue-600",
      detailsUrl: "#",
      applyUrl: "https://www.cloudflare.com/forstartups/",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Microsoft",
      programName: "Microsoft for Startups Founders Hub",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "Up to $150,000",
      valueVariant: "bg-blue-500 dark:bg-blue-600",
      description: "Azure credits plus free GitHub Enterprise (20 seats), Microsoft 365, Visual Studio, and OpenAI credits. Includes technical support and mentorship.",
      category: "Cloud Infrastructure",
      categoryVariant: "bg-blue-500 dark:bg-blue-600",
      detailsUrl: "#",
      applyUrl: "https://foundershub.startups.microsoft.com/",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Amazon Web Services",
      programName: "AWS Activate",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "Up to $100,000",
      valueVariant: "bg-blue-500 dark:bg-blue-600",
      description: "AWS credits covering EC2, S3, Lambda, RDS, DynamoDB, and most AWS services. Includes technical support, training, and business guidance.",
      category: "Cloud Infrastructure",
      categoryVariant: "bg-blue-500 dark:bg-blue-600",
      detailsUrl: "#",
      applyUrl: "https://aws.amazon.com/activate/",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Anthropic",
      programName: "Anthropic Startup Program",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "$25,000",
      valueVariant: "bg-purple-500 dark:bg-purple-600",
      description: "Claude API credits with priority rate limits and access to Anthropic technical resources. Includes invitations to exclusive founder events.",
      category: "AI & Machine Learning",
      categoryVariant: "bg-purple-500 dark:bg-purple-600",
      detailsUrl: "#",
      applyUrl: "https://www.anthropic.com/startups",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "ElevenLabs",
      programName: "ElevenLabs Grants Program",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "33 million characters (~$4,000+)",
      valueVariant: "bg-purple-500 dark:bg-purple-600",
      description: "12 months of Scale-tier access for voice AI including text-to-speech, voice cloning, and conversational AI agents. Over 680 hours of generated audio.",
      category: "AI & Machine Learning",
      categoryVariant: "bg-purple-500 dark:bg-purple-600",
      detailsUrl: "#",
      applyUrl: "https://elevenlabs.io/startup-grants",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Mixpanel",
      programName: "Mixpanel for Startups",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "$50,000",
      valueVariant: "bg-orange-500 dark:bg-orange-600",
      description: "One year free of Mixpanel Growth plan including product analytics, session replay (500K sessions), and unlimited seats.",
      category: "Analytics & Monitoring",
      categoryVariant: "bg-orange-500 dark:bg-orange-600",
      detailsUrl: "#",
      applyUrl: "https://mixpanel.com/startups",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "PostHog",
      programName: "PostHog for Startups",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "$50,000",
      valueVariant: "bg-orange-500 dark:bg-orange-600",
      description: "All-in-one platform with product analytics, session replay, feature flags, A/B testing, and surveys. Free tier covers 30M events/month.",
      category: "Analytics & Monitoring",
      categoryVariant: "bg-orange-500 dark:bg-orange-600",
      detailsUrl: "#",
      applyUrl: "https://posthog.com/startups",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Datadog",
      programName: "Datadog for Startups",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "1 year free",
      valueVariant: "bg-orange-500 dark:bg-orange-600",
      description: "Comprehensive monitoring platform including APM, infrastructure monitoring, log management, and real-time observability.",
      category: "Analytics & Monitoring",
      categoryVariant: "bg-orange-500 dark:bg-orange-600",
      detailsUrl: "#",
      applyUrl: "https://www.datadoghq.com/partner/datadog-for-startups/",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Retool",
      programName: "Retool Startup Program",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "Up to $60,000",
      valueVariant: "bg-cyan-500 dark:bg-cyan-600",
      description: "Build internal tools, admin panels, and dashboards without coding. 1 year free plus 25% off second year and $200k+ in partner offers.",
      category: "Developer Tools",
      categoryVariant: "bg-cyan-500 dark:bg-cyan-600",
      detailsUrl: "#",
      applyUrl: "https://retool.com/startups",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "GitHub",
      programName: "GitHub for Startups",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "20 seats free (GitHub Enterprise)",
      valueVariant: "bg-cyan-500 dark:bg-cyan-600",
      description: "GitHub Enterprise for 12 months including advanced security, compliance tools, and project management features.",
      category: "Developer Tools",
      categoryVariant: "bg-cyan-500 dark:bg-cyan-600",
      detailsUrl: "#",
      applyUrl: "https://github.com/enterprise/startups",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
    {
      companyName: "Stripe",
      programName: "Stripe Atlas",
      iconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-11.svg",
      valueAmount: "$150 off incorporation + perks",
      valueVariant: "bg-gray-500 dark:bg-gray-600",
      description: "Delaware C-corp incorporation with tax ID, 83(b) filing, banking, and access to extensive partner perks and discounts.",
      category: "Other Services",
      categoryVariant: "bg-gray-500 dark:bg-gray-600",
      detailsUrl: "#",
      applyUrl: "https://stripe.com/atlas",
      detailsIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-12.svg",
      applyIconUrl: "https://c.animaapp.com/mlseovf9zNouWW/assets/icon-13.svg",
    },
  ];

  return (
    <div id="perks" className="box-border caret-transparent gap-x-6 grid grid-cols-1 gap-y-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {perks.map((perk, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
        >
          <PerkCard {...perk} />
        </motion.div>
      ))}
    </div>
  );
};
