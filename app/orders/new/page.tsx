import { UploadForm } from "@/components/upload-form";

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-graphite">Bestellung hochladen</h1>
        <p className="mt-2 max-w-2xl text-sm text-steel">
          PDF importieren, Positionen auslesen und direkt als Werkstattauftrag speichern.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
