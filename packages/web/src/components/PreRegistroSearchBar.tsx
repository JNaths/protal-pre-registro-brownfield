import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEBOUNCE_MS = 300;

export function PreRegistroSearchBar({
  initialNombre,
  initialFecha,
  onSearch,
}: {
  initialNombre?: string;
  initialFecha?: string;
  onSearch: (nombre: string, fecha: string | null) => void;
}) {
  const [nombre, setNombre] = useState(initialNombre ?? "");
  const [fecha, setFecha] = useState(initialFecha ?? "");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WR-03: the debounced name callback must read the LATEST fecha, not the one
  // captured when the timer was scheduled. Without this, typing a name and then
  // picking a date within the 300ms window fires the stale name timer with the
  // old (empty) fecha and wipes the just-selected date filter. A ref kept in
  // sync with state gives the timeout the current value.
  const fechaRef = useRef(fecha);
  useEffect(() => {
    fechaRef.current = fecha;
  }, [fecha]);

  function handleNombreChange(value: string) {
    setNombre(value);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onSearch(value, fechaRef.current || null);
    }, DEBOUNCE_MS);
  }

  function handleFechaChange(value: string) {
    setFecha(value);
    onSearch(nombre, value || null);
  }

  function handleClear() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setNombre("");
    setFecha("");
    onSearch("", null);
  }

  return (
    <div
      aria-label="Filtrar pre-registros por nombre y fecha"
      className="flex flex-col gap-4 md:flex-row md:items-end"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-nombre">Buscar por nombre</Label>
        <Input
          id="search-nombre"
          type="text"
          placeholder="Ingresa el nombre del paciente"
          value={nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-fecha">Fecha de envío</Label>
        <Input
          id="search-fecha"
          type="date"
          value={fecha}
          onChange={(e) => handleFechaChange(e.target.value)}
        />
      </div>
      <Button type="button" variant="outline" onClick={handleClear}>
        Limpiar filtros
      </Button>
    </div>
  );
}
