import { motion } from "framer-motion";
import { CategoryCard } from "@/sections/CategorySection/components/CategoryCard";

type CategoryGridProps = {
  isInView: boolean;
};

export const CategoryGrid = ({ isInView }: CategoryGridProps) => {
  const categories = [
    {
      category: "cloud",
      emoji: "☁️",
      title: "Cloud Infrastructure",
      variant: "bg-blue-500 dark:bg-blue-600",
      titleVariant: "text-white",
    },
    {
      category: "ai",
      emoji: "🤖",
      title: "AI & ML Platforms",
      variant: "bg-purple-500 dark:bg-purple-600",
      titleVariant: "text-white",
    },
    {
      category: "database",
      emoji: "🗄️",
      title: "Database Services",
      variant: "bg-green-500 dark:bg-green-600",
      titleVariant: "text-white",
    },
    {
      category: "analytics",
      emoji: "📊",
      title: "Analytics & Monitoring",
      variant: "bg-orange-500 dark:bg-orange-600",
      titleVariant: "text-white",
    },
    {
      category: "developer",
      emoji: "🛠️",
      title: "Developer Tools",
      variant: "bg-cyan-500 dark:bg-cyan-600",
      titleVariant: "text-white",
    },
    {
      category: "communication",
      emoji: "📧",
      title: "Communication",
      variant: "bg-pink-500 dark:bg-pink-600",
      titleVariant: "text-white",
    },
    {
      category: "design",
      emoji: "🎨",
      title: "Design & Collab",
      variant: "bg-yellow-500 dark:bg-yellow-600",
      titleVariant: "",
    },
    {
      category: "other",
      emoji: "📦",
      title: "Other Services",
      variant: "bg-gray-500 dark:bg-gray-600",
      titleVariant: "text-white",
    },
  ];

  return (
    <div className="box-border caret-transparent gap-x-4 grid grid-cols-2 gap-y-4 md:grid-cols-4">
      {categories.map((category, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        >
          <CategoryCard {...category} />
        </motion.div>
      ))}
    </div>
  );
};
