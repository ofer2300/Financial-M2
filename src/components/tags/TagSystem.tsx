import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Plus, X, Upload, Tag as TagIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  parentId?: string;
  children?: Tag[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Props {
  onTagCreate: (tag: Tag) => void;
  onTagUpdate: (tagId: string, updates: Partial<Tag>) => void;
  onTagDelete: (tagId: string) => void;
  onCategoryCreate: (category: Category) => void;
  onCategoryUpdate: (categoryId: string, updates: Partial<Category>) => void;
  onCategoryDelete: (categoryId: string) => void;
}

export function TagSystem({
  onTagCreate,
  onTagUpdate,
  onTagDelete,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
}: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newTag, setNewTag] = useState<Partial<Tag>>({});
  const [newCategory, setNewCategory] = useState<Partial<Category>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ארגון תגיות בצורה היררכית
  const organizeTagsHierarchy = (flatTags: Tag[]): Tag[] => {
    const tagMap = new Map<string, Tag>();
    const rootTags: Tag[] = [];

    // יצירת מפה של כל התגיות
    flatTags.forEach(tag => {
      tagMap.set(tag.id, { ...tag, children: [] });
    });

    // בניית ההיררכיה
    flatTags.forEach(tag => {
      const tagWithChildren = tagMap.get(tag.id)!;
      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(tagWithChildren);
        }
      } else {
        rootTags.push(tagWithChildren);
      }
    });

    return rootTags;
  };

  // יבוא תגיות מאקסל
  const importTagsFromExcel = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      jsonData.forEach((row: any) => {
        const tag: Tag = {
          id: `tag-${Date.now()}-${Math.random()}`,
          name: row.name,
          color: row.color || '#000000',
          category: row.category,
          parentId: row.parentId,
        };
        onTagCreate(tag);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // רינדור רקורסיבי של תגיות
  const renderTag = (tag: Tag, depth = 0) => (
    <div
      key={tag.id}
      className="flex items-center justify-between p-2 border rounded"
      style={{ marginRight: `${depth * 20}px` }}
    >
      <div className="flex items-center gap-2">
        <Badge
          style={{
            backgroundColor: tag.color,
            color: getContrastColor(tag.color),
          }}
        >
          <TagIcon className="w-4 h-4 ml-1" />
          {tag.name}
        </Badge>
        {tag.category && (
          <Badge variant="outline">
            {categories.find(c => c.id === tag.category)?.name}
          </Badge>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setNewTag({
              name: tag.name,
              color: tag.color,
              category: tag.category,
              parentId: tag.id,
            });
            setIsCreatingTag(true);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onTagDelete(tag.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {tag.children && tag.children.length > 0 && (
        <div className="mr-4">
          {tag.children.map(child => renderTag(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול תגיות</h2>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCreatingCategory(true)}
          >
            <Plus className="ml-2 h-4 w-4" />
            קטגוריה חדשה
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsCreatingTag(true)}
          >
            <Plus className="ml-2 h-4 w-4" />
            תגית חדשה
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  importTagsFromExcel(file);
                }
              }}
              id="excel-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('excel-upload')?.click()}
            >
              <Upload className="ml-2 h-4 w-4" />
              יבוא מאקסל
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map(category => (
          <div key={category.id}>
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: category.color }}
            >
              {category.name}
            </h3>
            <div className="space-y-2">
              {organizeTagsHierarchy(tags.filter(t => t.category === category.id))
                .map(tag => renderTag(tag))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-lg font-medium mb-2">ללא קטגוריה</h3>
          <div className="space-y-2">
            {organizeTagsHierarchy(tags.filter(t => !t.category))
              .map(tag => renderTag(tag))}
          </div>
        </div>
      </div>

      <Dialog open={isCreatingTag} onOpenChange={setIsCreatingTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת תגית חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם התגית</label>
              <Input
                value={newTag.name || ''}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="הזן שם לתגית..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">צבע</label>
              <Input
                type="color"
                value={newTag.color || '#000000'}
                onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">קטגוריה</label>
              <Select
                value={newTag.category}
                onValueChange={(value) => setNewTag({ ...newTag, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">תגית אב</label>
              <Select
                value={newTag.parentId}
                onValueChange={(value) => setNewTag({ ...newTag, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תגית אב" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingTag(false)}>
                ביטול
              </Button>
              <Button
                onClick={() => {
                  if (newTag.name) {
                    onTagCreate({
                      id: `tag-${Date.now()}`,
                      ...newTag as Tag,
                    });
                    setIsCreatingTag(false);
                    setNewTag({});
                  }
                }}
              >
                צור תגית
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingCategory} onOpenChange={setIsCreatingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת קטגוריה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם הקטגוריה</label>
              <Input
                value={newCategory.name || ''}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="הזן שם לקטגוריה..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">צבע</label>
              <Input
                type="color"
                value={newCategory.color || '#000000'}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingCategory(false)}>
                ביטול
              </Button>
              <Button
                onClick={() => {
                  if (newCategory.name) {
                    onCategoryCreate({
                      id: `category-${Date.now()}`,
                      ...newCategory as Category,
                    });
                    setIsCreatingCategory(false);
                    setNewCategory({});
                  }
                }}
              >
                צור קטגוריה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// פונקציית עזר לחישוב צבע טקסט מנוגד
function getContrastColor(hexcolor: string) {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
} 