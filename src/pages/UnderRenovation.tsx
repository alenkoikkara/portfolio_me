import { motion } from "framer-motion";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			delayChildren: 0.2,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, filter: "blur(10px)", y: 24 },
	visible: {
		opacity: 1,
		filter: "blur(0px)",
		y: 0,
		transition: { duration: 0.8, ease: "easeOut" },
	},
};

const lineVariants = {
	hidden: { scaleX: 0, opacity: 0 },
	visible: {
		scaleX: 1,
		opacity: 1,
		transition: { duration: 1, ease: "easeOut", delay: 0.4 },
	},
};

const UnderRenovation = () => {
	return (
		<div className="min-h-screen dark:bg-blackboard-black bg-white flex flex-col items-start justify-center px-6 md:px-14 relative overflow-hidden">
			{/* Ambient background glow */}
			<motion.div
				className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
				style={{
					background:
						"radial-gradient(circle, oklch(0.82 0.17046 77.4296 / 0.12) 0%, transparent 70%)",
				}}
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1.6, ease: "easeOut" }}
			/>
			<motion.div
				className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none"
				style={{
					background:
						"radial-gradient(circle, oklch(0.73 0.1245 193.43 / 0.10) 0%, transparent 70%)",
				}}
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
			/>

			{/* Main content */}
			<motion.div
				className="relative z-10 max-w-3xl"
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				{/* Label */}
				<motion.div variants={itemVariants}>
					<span className="text-xs md:text-sm tracking-widest uppercase text-slate font-light">
						Currently in progress
					</span>
				</motion.div>

				{/* Divider line */}
				<motion.div
					className="mt-4 mb-6 h-px bg-silver origin-left"
					variants={lineVariants}
				/>

				{/* Headline */}
				<motion.h1
					className="font-light text-4xl md:text-[clamp(2.5rem,7vw,6rem)] leading-[1.05] text-silver-dark dark:text-silver"
					variants={itemVariants}
				>
					This site is
				</motion.h1>
				<motion.h1
					className="font-light text-4xl md:text-[clamp(2.5rem,7vw,6rem)] leading-[1.05] text-blackboard-black dark:text-white"
					variants={itemVariants}
				>
					under renovation.
				</motion.h1>

				{/* Sub-copy */}
				<motion.p
					className="mt-6 md:mt-8 text-sm md:text-base text-slate font-light max-w-sm leading-relaxed"
					variants={itemVariants}
				>
					Something better is taking shape here. Check back soon — it'll be worth the wait.
				</motion.p>
			</motion.div>

			{/* Bottom decoration — large faded text */}
			<motion.div
				className="absolute bottom-0 left-0 right-0 flex items-end px-6 md:px-14 pb-6 pointer-events-none select-none"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 1.2, ease: "easeOut", delay: 1 }}
			>
				<span
					className="text-[clamp(3rem,12vw,9rem)] font-light leading-none text-silver dark:text-silver-dark opacity-20 tracking-tight whitespace-nowrap overflow-hidden"
				>
					renovation
				</span>
			</motion.div>
		</div>
	);
};

export default UnderRenovation;
