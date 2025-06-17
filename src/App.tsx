/* eslint-disable prettier/prettier */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { client } from './utils/fetchClient';
import { Todo } from './types/Todo';

type FilterType = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Auto-clear error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [errorMessage]);

  // Load todos on component mount
  useEffect(() => {
    setLoadingAction('load');
    client
      .get<Todo[]>(`/todos?userId=${USER_ID}`)
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setLoadingAction(null));
  }, []);

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = newTodoTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage('Title should not be empty');

      return;
    }

    setLoadingAction('add');
    client
      .post<Todo>('/todos', {
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    })
      .then(newTodo => {
        setTodos(prev => [...prev, newTodo]);
        setNewTodoTitle('');
      })
      .catch(() => setErrorMessage('Unable to add a todo'))
      .finally(() => setLoadingAction(null));
  };

  const handleDeleteTodo = (id: number) => {
    setLoadingAction(`delete-${id}`);
    client
      .delete(`/todos/${id}`)
      .then(() => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
      })
      .catch(() => setErrorMessage('Unable to delete a todo'))
      .finally(() => setLoadingAction(null));
  };

  const handleToggleCompleted = (id: number) => {
    setLoadingAction(`toggle-${id}`);
    const todo = todos.find(t => t.id === id);

    if (!todo) {
      setLoadingAction(null);

      return;
    }

    client
      .patch<Todo>(`/todos/${id}`, { completed: !todo.completed })
      .then((updatedTodo: Todo) => {
        setTodos(prev =>
          prev.map(t =>
            t.id === id ? { ...t, completed: updatedTodo.completed } : t
          )
        );
      })
      .catch(() => setErrorMessage('Unable to update todo'))
      .finally(() => setLoadingAction(null));
  };

  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const hasCompletedTodos = todos.some(todo => todo.completed);

  const clearCompleted = () => {
    setLoadingAction('clear');
    const completedTodos = todos.filter(todo => todo.completed);

    Promise.all(
      completedTodos.map(todo => client.delete(`/todos/${todo.id}`))
    )
      .then(() => {
        setTodos(prev => prev.filter(todo => !todo.completed));
      })
      .catch(() => setErrorMessage('Unable to clear completed todos'))
      .finally(() => setLoadingAction(null));
  };

  const handleToggleAll = () => {
    const shouldCompleteAll = todos.some(todo => !todo.completed);

    setLoadingAction('toggle-all');
    Promise.all(
      todos.map(todo =>
        client.patch(`/todos/${todo.id}`, { completed: shouldCompleteAll })
      )
    )
      .then(() => {
        setTodos(prev =>
          prev.map(todo => ({ ...todo, completed: shouldCompleteAll }))
        );
      })
      .catch(() => setErrorMessage('Unable to toggle all todos'))
      .finally(() => setLoadingAction(null));
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={`todoapp__toggle-all ${activeTodosCount === 0 ? 'active' : ''}`}
            data-cy="ToggleAllButton"
            onClick={handleToggleAll}
            disabled={loadingAction === 'toggle-all' || todos.length === 0}
            aria-label={
              activeTodosCount === 0
                ? 'Mark all as incomplete'
                : 'Mark all as complete'
            }
          />

          <form onSubmit={handleAddTodo}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={loadingAction !== null}
              aria-label="New todo input"
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleToggleCompleted(todo.id)}
                  disabled={loadingAction === `toggle-${todo.id}`}
                  aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={loadingAction === `delete-${todo.id}`}
                aria-label={`Delete "${todo.title}"`}
              >
                ×
              </button>
            </div>
          ))}
        </section>
      </div>

      {todos.length > 0 && (
        <div className="todoapp__content">
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeTodosCount}{' '}
              {activeTodosCount === 1 ? 'item' : 'items'} left
            </span>

            <nav
              className="filter"
              data-cy="Filter"
              role="navigation"
              aria-label="Filter todos"
            >
              <button
                type="button"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => handleFilterChange('all')}
                aria-label="Show all todos"
              >
                All
              </button>
              <button
                type="button"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => handleFilterChange('active')}
                aria-label="Show active todos"
              >
                Active
              </button>
              <button
                type="button"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => handleFilterChange('completed')}
                aria-label="Show completed todos"
              >
                Completed
              </button>
            </nav>

            {hasCompletedTodos && (
              <button
                type="button"
                className="todoapp__clear-completed"
                data-cy="ClearCompletedButton"
                onClick={clearCompleted}
                disabled={loadingAction === 'clear'}
                aria-label="Clear all completed todos"
              >
                Clear completed
              </button>
            )}
          </footer>
        </div>
      )}

      {errorMessage && (
        <div
          data-cy="ErrorNotification"
          className="notification is-danger is-light has-text-weight-normal"
          role="alert"
          aria-live="polite"
        >
          <button
            type="button"
            className="delete"
            onClick={() => setErrorMessage('')}
            aria-label="Close error message"
          />
          {errorMessage}
        </div>
      )}
    </div>
  );
};
