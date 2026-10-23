import React from 'react';
import { GraduationCap, ShieldCheck, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-pearl-200 bg-midnight-950 text-pearl-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-brand flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5 text-indigo-glow" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Eval<span className="text-indigo-glow">Tech</span>
              </span>
            </div>
            <p className="text-xs text-pearl-300/80 leading-relaxed">
              Enterprise examination management SaaS engineered for schools, universities, institutes, and individual educators.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational (99.98% Uptime)
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Solutions
            </h4>
            <ul className="space-y-2 text-xs text-pearl-300">
              <li><Link to="/register" className="hover:text-white transition-colors">Individual Teachers</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">K-12 Schools & Academies</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Colleges & Universities</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Corporate Certifications</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-pearl-300">
              <li><a href="#features" className="hover:text-white transition-colors">AI Question Generator</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Automated Evaluation</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Anti-Tamper Monitoring</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Student Capacity Engine</a></li>
            </ul>
          </div>

          {/* Compliance & Security */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Security & Trust
            </h4>
            <ul className="space-y-2 text-xs text-pearl-300">
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-indigo-glow" /> FERPA & GDPR Ready</li>
              <li>256-bit TLS Encryption</li>
              <li>Multi-Tenant Isolation</li>
              <li>Cryptographic Razorpay Signatures</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-midnight-800 flex flex-col sm:flex-row items-center justify-between text-xs text-pearl-300/60 gap-4">
          <p>&copy; {new Date().getFullYear()} EvalTech Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Security Disclosures</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
