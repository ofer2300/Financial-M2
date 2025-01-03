import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { Search, Save, History, Share2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | string[] | { from: string; to: string };
}

interface SavedFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  createdAt: string;
  createdBy: string;
  isShared: boolean;
}

interface SearchHistory {
  id: string;
  query: string;
  filters: FilterCondition[];
  timestamp: string;
  results: number;
}

interface Props {
  onSearch: (query: string, filters: FilterCondition[]) => void;
  onFilterSave: (filter: Omit<SavedFilter, 'id' | 'createdAt'>) => void;
  onFilterShare: (filterId: string) => void;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  fields: {
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'multiSelect';
    options?: string[];
  }[];
}

export function FilterSearch({
  onSearch,
  onFilterSave,
  onFilterShare,
  currentUser,
  fields,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [isCreatingFilter, setIsCreatingFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // טעינת היסטוריית חיפושים מהאחסון המקומי
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // שמירת היסטוריית חיפושים באחסון המקומי
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // הוספת תנאי סינון חדש
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: fields[0].name,
      operator: 'equals',
      value: '',
    };
    setConditions([...conditions, newCondition]);
  };

  // הסרת תנאי סינון
  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  // עדכון תנאי סינון
  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  // ביצוע חיפוש
  const handleSearch = () => {
    onSearch(searchQuery, conditions);

    // הוספה להיסטוריה
    const searchEntry: SearchHistory = {
      id: `search-${Date.now()}`,
      query: searchQuery,
      filters: conditions,
      timestamp: new Date().toISOString(),
      results: 0, // יש לעדכן עם מספר התוצאות האמיתי
    };
    setSearchHistory([searchEntry, ...searchHistory.slice(0, 49)]); // שמירת 50 חיפושים אחרונים
  };

  // שמירת מסנן
  const saveFilter = () => {
    if (!newFilterName.trim()) return;

    const filter = {
      name: newFilterName.trim(),
      conditions,
      createdBy: currentUser.id,
      isShared: false,
    };

    onFilterSave(filter);
    setNewFilterName('');
    setIsCreatingFilter(false);
  };

  // טעינת מסנן שמור
  const loadFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setConditions(filter.conditions);
      setSelectedFilter(filterId);
    }
  };

  // שיתוף מסנן
  const shareFilter = (filterId: string) => {
    onFilterShare(filterId);
    setSavedFilters(savedFilters.map(f =>
      f.id === filterId ? { ...f, isShared: true } : f
    ));
  };

  // שחזור חיפוש מההיסטוריה
  const restoreSearch = (entry: SearchHistory) => {
    setSearchQuery(entry.query);
    setConditions(entry.filters);
    setShowHistory(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש..."
            className="w-full"
          />
        </div>

        <Button variant="outline" onClick={() => setShowHistory(true)}>
          <History className="ml-2 h-4 w-4" />
          היסטוריה
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Save className="ml-2 h-4 w-4" />
              מסננים שמורים
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>מסננים שמורים</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {savedFilters.map(filter => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <div className="font-medium">{filter.name}</div>
                    <div className="text-sm text-gray-500">
                      נוצר ב-{format(new Date(filter.createdAt), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => loadFilter(filter.id)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    {!filter.isShared && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => shareFilter(filter.id)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsCreatingFilter(true)}
              >
                <Plus className="ml-2 h-4 w-4" />
                שמור מסנן חדש
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={handleSearch}>
          <Search className="ml-2 h-4 w-4" />
          חפש
        </Button>
      </div>

      <div className="space-y-4">
        {conditions.map(condition => (
          <div
            key={condition.id}
            className="flex gap-4 items-start p-4 border rounded"
          >
            <Select
              value={condition.field}
              onValueChange={(value) => updateCondition(condition.id, { field: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map(field => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={condition.operator}
              onValueChange={(value) => updateCondition(condition.id, { operator: value as FilterCondition['operator'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">שווה ל</SelectItem>
                <SelectItem value="contains">מכיל</SelectItem>
                <SelectItem value="startsWith">מתחיל ב</SelectItem>
                <SelectItem value="endsWith">מסתיים ב</SelectItem>
                <SelectItem value="greaterThan">גדול מ</SelectItem>
                <SelectItem value="lessThan">קטן מ</SelectItem>
                <SelectItem value="between">בין</SelectItem>
                <SelectItem value="in">נמצא ברשימה</SelectItem>
              </SelectContent>
            </Select>

            {condition.operator === 'between' ? (
              <div className="flex gap-2 flex-1">
                <Input
                  value={(condition.value as { from: string; to: string }).from}
                  onChange={(e) => updateCondition(condition.id, {
                    value: {
                      ...(condition.value as { from: string; to: string }),
                      from: e.target.value,
                    },
                  })}
                  placeholder="מ..."
                />
                <Input
                  value={(condition.value as { from: string; to: string }).to}
                  onChange={(e) => updateCondition(condition.id, {
                    value: {
                      ...(condition.value as { from: string; to: string }),
                      to: e.target.value,
                    },
                  })}
                  placeholder="עד..."
                />
              </div>
            ) : condition.operator === 'in' ? (
              <Input
                value={(condition.value as string[]).join(', ')}
                onChange={(e) => updateCondition(condition.id, {
                  value: e.target.value.split(',').map(v => v.trim()),
                })}
                placeholder="ערכים מופרדים בפסיקים..."
                className="flex-1"
              />
            ) : (
              <Input
                value={condition.value as string}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                placeholder="ערך..."
                className="flex-1"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(condition.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" onClick={addCondition}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף תנאי
        </Button>
      </div>

      <Dialog open={isCreatingFilter} onOpenChange={setIsCreatingFilter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שמירת מסנן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם המסנן</label>
              <Input
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                placeholder="הזן שם למסנן..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingFilter(false)}>
                ביטול
              </Button>
              <Button onClick={saveFilter}>
                שמור מסנן
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>היסטוריית חיפושים</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {searchHistory.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <div className="font-medium">{entry.query || 'חיפוש ללא מילות מפתח'}</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                    {' · '}
                    {entry.results} תוצאות
                  </div>
                  <div className="flex gap-1 mt-1">
                    {entry.filters.map(filter => (
                      <Badge key={filter.id} variant="secondary">
                        {filter.field} {filter.operator} {
                          typeof filter.value === 'object'
                            ? JSON.stringify(filter.value)
                            : filter.value
                        }
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => restoreSearch(entry)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 