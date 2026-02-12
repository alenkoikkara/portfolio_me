import React, { useState } from "react";
import { motion } from "framer-motion";

const ContactForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Form submitted:", formData);
        setIsSubmitting(false);
        onSuccess();
    };

    const inputClasses = "w-full bg-transparent border-b border-slate/30 py-2 focus:border-slate focus:outline-none transition-colors dark:text-white text-blackboard-black placeholder:text-slate/50";
    const labelClasses = "block text-xs font-medium text-slate uppercase tracking-wider mb-1";

    return (
        <div className="p-8 md:p-10">
            <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold dark:text-white text-blackboard-black mb-2">Let's Connect</h2>
                <p className="text-slate text-sm md:text-base">Have a project in mind or just want to say hi? <br />Fill out the form below.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                        <label htmlFor="name" className={labelClasses}>Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className={inputClasses}
                            placeholder="Your Name"
                        />
                    </div>
                    <div className="group">
                        <label htmlFor="email" className={labelClasses}>Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className={inputClasses}
                            placeholder="your@email.com"
                        />
                    </div>
                </div>

                <div className="group">
                    <label htmlFor="subject" className={labelClasses}>Subject</label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Project Inquiry"
                    />
                </div>

                <div className="group">
                    <label htmlFor="message" className={labelClasses}>Message</label>
                    <textarea
                        id="message"
                        name="message"
                        required
                        rows={4}
                        value={formData.message}
                        onChange={handleChange}
                        className={`${inputClasses} resize-none`}
                        placeholder="Tell me about your project..."
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-blackboard-black dark:bg-white text-white dark:text-blackboard-black rounded-full font-medium text-sm transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                        {isSubmitting ? "Sending..." : "Send Message"}
                    </motion.button>
                </div>
            </form>
        </div>
    );
};

export default ContactForm;
