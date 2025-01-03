import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface Filter {
  type: 'search' | 'status' | 'priority' | 'date' | 'tag';
  value: string | Date | null;
}

interface Props {
  onFilterChange: (filters: Filter[]) => void;
  availableTags: string[];
}

export function FilterSystem({ onFilterChange, availableTags }: Props) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const addFilter = (type: Filter['type'], value: Filter['value']) => {
    if (!value) return;
    
    const newFilter: Filter = { type, value };
    const newFilters = [...filters, newFilter];
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      addFilter('search', searchTerm);
      setSearchTerm('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {/* חיפוש טקסט חופשי */}
        <div className="flex gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש..."
            className="w-64"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>חפש</Button>
        </div>

        {/* סטטוס */}
        <Select onValueChange={(value) => addFilter('status', value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">לביצוע</SelectItem>
            <SelectItem value="in_progress">בתהליך</SelectItem>
            <SelectItem value="done">הושלם</SelectItem>
          </SelectContent>
        </Select>

        {/* עדיפות */}
        <Select onValueChange={(value) => addFilter('priority', value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="עדיפות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">נמוכה</SelectItem>
            <SelectItem value="medium">בינונית</SelectItem>
            <SelectItem value="high">גבוהה</SelectItem>
          </SelectContent>
        </Select>

        {/* תאריך */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px]">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, 'dd/MM/yyyy')
              ) : (
                'בחר תאריך'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date) addFilter('date', date);
              }}
              locale={he}
            />
          </PopoverContent>
        </Popover>

        {/* תגיות */}
        <Select onValueChange={(value) => addFilter('tag', value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="תגית" />
          </SelectTrigger>
          <SelectContent>
            {availableTags.map(tag => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* פילטרים פעילים */}
      {filters.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {filter.type === 'date'
                ? format(filter.value as Date, 'dd/MM/yyyy')
                : filter.value?.toString()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter(index)}
              />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters([]);
              onFilterChange([]);
            }}
          >
            נקה הכל
          </Button>
        </div>
      )}
    </div>
  );
} 