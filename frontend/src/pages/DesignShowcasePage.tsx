import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Chip } from '../components/ui/Chip';
import { Badge } from '../components/ui/Badge';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Stepper } from '../components/ui/Stepper';
import { Modal } from '../components/ui/Modal';
import { Sheet } from '../components/ui/Sheet';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import { Tooltip } from '../components/ui/Tooltip';
import { ElderIllustration } from '../components/illustrations/ElderIllustration';
import { FamilyIllustration } from '../components/illustrations/FamilyIllustration';
import { Heart, Bell, Shield, ArrowRight } from 'lucide-react';

export const DesignShowcasePage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chipSelected, setChipSelected] = useState(true);
  const [activeTab, setActiveTab] = useState('components');
  const [step, setStep] = useState(2);

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="border-b border-sand dark:border-teal-900 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-paper font-serif font-bold">
              C
            </span>
            <h1 className="text-3xl font-serif font-bold text-ink dark:text-paper">
              CareCircle Design System
            </h1>
          </div>
          <p className="text-ink/70 dark:text-sand/70 text-base">
            Warm teal and paper palette, Fraunces serif headings, Inter body, 20px card radius, 56px elderly tap targets, WCAG AAA contrast.
          </p>
        </header>

        {/* Color Palette */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
            Color Tokens
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
            {[
              { name: 'Ink', hex: '#12302F', bg: 'bg-[#12302F]', text: 'text-white' },
              { name: 'Deep Teal', hex: '#0F5C5A', bg: 'bg-[#0F5C5A]', text: 'text-white' },
              { name: 'Mint Wash', hex: '#E6F2EF', bg: 'bg-[#E6F2EF]', text: 'text-[#12302F]' },
              { name: 'Warm Paper', hex: '#FBF8F3', bg: 'bg-[#FBF8F3]', text: 'text-[#12302F]' },
              { name: 'Sand', hex: '#F1EBDF', bg: 'bg-[#F1EBDF]', text: 'text-[#12302F]' },
              { name: 'Clay (SOS)', hex: '#C8553D', bg: 'bg-[#C8553D]', text: 'text-white' },
              { name: 'Amber', hex: '#D9922B', bg: 'bg-[#D9922B]', text: 'text-white' },
              { name: 'Sage', hex: '#3F8F5B', bg: 'bg-[#3F8F5B]', text: 'text-white' },
            ].map((c) => (
              <div key={c.name} className="rounded-2xl p-4 shadow-sm border border-sand dark:border-teal-900 space-y-2">
                <div className={`h-16 w-full rounded-xl ${c.bg}`} />
                <div>
                  <div className="text-sm font-bold text-ink dark:text-paper">{c.name}</div>
                  <div className="text-xs text-ink/60 dark:text-sand/60 font-mono">{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
            Buttons & Tap Targets
          </h2>
          <Card className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button isLoading>Loading State</Button>
            </div>
            <div>
              <p className="text-sm font-medium text-ink/70 dark:text-sand/70 mb-2">
                Elderly Tap Target (min 56px height, 20px font):
              </p>
              <Button size="patient" variant="primary" className="w-full sm:w-auto">
                Take it Now (56px Target)
              </Button>
            </div>
          </Card>
        </section>

        {/* Form Controls */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
            Form Controls & Chips
          </h2>
          <Card className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Patient Full Name" placeholder="e.g. Lakshmi Raman" />
            <Input label="Mobile Phone" placeholder="9876543210" />
            <Input label="With Error" error="This field is required" defaultValue="Invalid value" />

            <div className="md:col-span-3 flex flex-wrap items-center gap-3 pt-2">
              <Chip selected={chipSelected} onClick={() => setChipSelected(!chipSelected)} count={3}>
                Morning Medicines
              </Chip>
              <Chip selected={!chipSelected} onClick={() => setChipSelected(!chipSelected)}>
                Evening Dose
              </Chip>
              <Badge variant="sage">Adherent 98%</Badge>
              <Badge variant="amber">Attention Needed</Badge>
              <Badge variant="clay">Emergency</Badge>
              <Badge variant="teal">Care Team</Badge>
            </div>
          </Card>
        </section>

        {/* Feedback & Progress */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
            Feedback & Progress
          </h2>
          <Card className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="flex flex-col items-center gap-3">
              <ProgressRing value={85} size={120} strokeWidth={10} color="#0F5C5A" />
              <p className="text-sm font-medium text-ink/70 dark:text-sand/70">Risk Score Ring</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-ink/70 dark:text-sand/70">
                Multi-step Progress Stepper:
              </p>
              <Stepper currentStep={step} totalSteps={5} labels={['Profile', 'Face ID', 'Vitals', 'Contacts', 'Review']} />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setStep(Math.max(1, step - 1))}>
                  Prev
                </Button>
                <Button size="sm" variant="primary" onClick={() => setStep(Math.min(5, step + 1))}>
                  Next
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-ink/70 dark:text-sand/70">Skeleton Loader:</p>
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
            </div>
          </Card>
        </section>

        {/* Dialogs & Sheets */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
            Modals & Overlays
          </h2>
          <Card className="flex flex-wrap gap-4">
            <Button onClick={() => setModalOpen(true)}>Open Accessible Modal</Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open Bottom Sheet
            </Button>
          </Card>

          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Accessible Modal Dialog">
            <p className="text-ink/80 dark:text-sand/80 leading-relaxed mb-6">
              This dialog implements focus trapping, Escape key dismiss, and smooth Framer Motion spring physics.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Dismiss
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Got it
              </Button>
            </div>
          </Modal>

          <Sheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Care Assistant Sheet">
            <p className="text-ink/80 dark:text-sand/80 leading-relaxed mb-4">
              CareCircle voice assistant bottom sheet designed for natural conversation and one-touch actions.
            </p>
          </Sheet>
        </section>

        {/* Custom SVG Illustrations */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-semibold text-ink dark:text-paper">
            Custom Editorial Illustrations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center text-center p-8">
              <ElderIllustration className="w-56 h-56 mb-4" />
              <h3 className="text-xl font-serif font-bold text-ink dark:text-paper mb-1">
                Gentle Medication Companion
              </h3>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                Designed specifically for elders with camera verification and warm chimes.
              </p>
            </Card>

            <Card className="flex flex-col items-center text-center p-8">
              <FamilyIllustration className="w-56 h-56 mb-4" />
              <h3 className="text-xl font-serif font-bold text-ink dark:text-paper mb-1">
                Family & Doctor Circles
              </h3>
              <p className="text-sm text-ink/70 dark:text-sand/70">
                Keeping family connected with real-time updates and emergency protection.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};
